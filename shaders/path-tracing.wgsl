// ----- Common Stuff ----- // 

struct Uniforms {
    matrix: mat3x3<f32>,
    position: vec3<f32>,
    focalLength: f32,
    aspectRatio: f32,
    samplesPerPixel: u32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

// ----- Vertex Shader ----- //

struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) xy: vec2<f32>,
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    let xy = vertices[i & 3u];
    return Vertex(
        vec4(xy, 0.0, 1.0),
        vec2(xy.x * uniforms.aspectRatio, xy.y)
    );
}

// ----- Fragment Shader ----- //

struct Box {
    volume: Volume,
    faceMaterials: array<u32, 6>,
};

struct BoxDirections {
    faces: array<FaceDirections, 6>,
};

struct FaceDirections {
    lights: array<atomic<u32>, 4>,
}

type Cell = array<u32, 8>;
type Grid = array<Cell, 262144>; // 262144 = 64 * 64 * 64

@group(0) @binding(1)
var<storage, read> materials: array<vec4<f32>>;

@group(0) @binding(2)
var<storage, read> boxes: array<Box>;

@group(0) @binding(3)
var<storage, read> grid: Grid;

@group(0) @binding(4)
var<storage, read_write> importantDirections: array<BoxDirections>;

@group(0) @binding(5)
var<storage, read_write> clock: atomic<u32>;

var<private> rng: vec4<u32>;
var<private> pixelSize: f32;

let EPSILON: f32 = 0x1P-11;
let RND_PRECISION: f32 = 0x1P-22;
let MAX_BOXES_PER_CELL: u32 = 8u;
let GRID_SIZE: vec3<i32> = vec3<i32>(262144, 4096, 64);
let NULL: u32 = 0xFFFFFFFFu;
let TWO_PI = 6.283185307179586476925286766559;
let ONE_BY_PI = 0.31830988618379067153776752674503;

// Pseudo Random Generation ... The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift
fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = vec4(t ^ s, rng.xyz);
    return rng.x;
}

fn next_unorm() -> f32 {
    let n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) * RND_PRECISION;
}

fn next_vec2() -> vec2<f32> {
    return vec2(next_unorm(), next_unorm());
}

fn seedRNG(position: vec2<f32>) {
    var p = vec2<u32>(position);
    var r = p.xyxy * vec4(3u, 7u, 5u, 11u) + vec4(atomicAdd(&clock, 1u));
    r = r + reverseBits(r.yzwx);
    r = r * reverseBits(r.zwxy);
    rng = r + reverseBits(r.wxyz);
}

// Rays

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
    invDirection: vec3<f32>,
};

fn newRay(position: vec3<f32>, direction: vec3<f32>) -> Ray {
    return Ray(
        position,
        direction,
        1.0 / direction,
    );
}

// Volumes (Geometry)

struct Volume {
    min: vec3<f32>,
    max: vec3<f32>,
    invSize: vec3<f32>,
};

var<private> normals: array<vec3<f32>, 6> = array<vec3<f32>, 6>(
    vec3( 0.0,  0.0, -1.0),
    vec3( 0.0, -1.0,  0.0),
    vec3(-1.0,  0.0,  0.0),
    vec3( 1.0,  0.0,  0.0),
    vec3( 0.0,  1.0,  0.0),
    vec3( 0.0,  0.0,  1.0),
); 

fn faceIdOf(volume: Volume, position: vec3<f32>) -> u32 {
    let v = (position - volume.min) * volume.invSize - 1.0;
    let xFace = select(2u, 3u, v.x > 0.0); 
    let yFace = select(1u, 4u, v.y > 0.0);
    let zFace = select(0u, 5u, v.z > 0.0); 
    let absV = abs(v);
    return select(
        select(zFace, yFace, absV.y > absV.z),
        select(zFace, xFace, absV.x > absV.z),
        absV.x > absV.y
    );
}

// Ray-Geometry Intersection

struct Hit {
    boxId: u32,
    distance: f32,
}

struct HitDetails {
    ray: Ray,
    position: vec3<f32>,
    materialId: u32,
    boxId: u32,
    faceId: u32,
}

fn hitRange(volume: Volume, ray: Ray, range: vec2<f32>) -> vec2<f32> {
    let t1 = (volume.min - ray.origin) * ray.invDirection;
    let t2 = (volume.max - ray.origin) * ray.invDirection;
    let mn = min(t1, t2);
    let mx = max(t1, t2);
    let d1 = max(max(max(mn.x, mn.y), mn.z), range[0]);
    let d2 = min(min(min(mx.x, mx.y), mx.z), range[1]);
    return vec2(d1, d2);
}

fn shoot(cell: Cell, ray: Ray, range: vec2<f32>) -> Hit {
    var r = range;
    var nearestBoxId = NULL;
    for (var i = 0u; i < MAX_BOXES_PER_CELL; i = i + 1u) {
        let boxId = cell[i];
        if (boxId == NULL) {
            break;
        }
        let newR = hitRange(boxes[boxId].volume, ray, r);
        if (newR[0] < newR[1]) {
            r[1] = newR[0];
            nearestBoxId = boxId;
        }
    }
    return Hit(nearestBoxId, r[1]);
}

fn detailsOf(hit: Hit, ray: Ray) -> HitDetails {
    let box = boxes[hit.boxId];
    let position = ray.origin + ray.direction * hit.distance;
    let faceId = faceIdOf(box.volume, position);
    let materialId = box.faceMaterials[faceId];
    return HitDetails(ray, position, materialId, hit.boxId, faceId);
}

// Grid Traversing

struct Traverser {
    ray: Ray,
    step: vec3<i32>,
    limit: vec3<i32>,
    distance: vec3<f32>,
    cell: vec3<i32>,
}

fn traverser(ray: Ray) -> Traverser {
    let direction = sign(ray.direction);
    let step = vec3<i32>(direction) << vec3(12u, 6u, 0u); 
    let rearCorner = max(-direction, vec3(0.0));
    let limit = select(vec3(-1, -64, -4096), GRID_SIZE, step > vec3(0));
    let distance = (rearCorner - fract(ray.origin)) * ray.invDirection; 
    let cell = vec3<i32>(ray.origin) << vec3(12u, 6u, 0u);
    return Traverser(ray, step, limit, distance, cell);
}

fn next(t: ptr<function, Traverser>) -> f32 {
    let next = (*t).distance + abs((*t).ray.invDirection);
    let result = min(next.x, min(next.y, next.z));
    let closest = (next == vec3(result));
    (*t).distance = select((*t).distance, next, closest);
    (*t).cell = (*t).cell + select(vec3(0), (*t).step, closest);
    return result;
}

// Sampling

struct Direction {
    direction: vec3<f32>,
    diffusePDF: f32,
    lightPDF: f32,
    lightId: u32,
}

struct WeightedRay {
    ray: Ray,
    weight: f32,
    lightId: u32,
} 

fn pixelSample(pixel: vec2<f32>) -> vec2<f32> {
    return pixel + next_vec2() * pixelSize;
}

fn diffuseDirection(normal: vec3<f32>) -> Direction {
    let matrix = mat3x3(abs(normal.yzx), normal, normal.zxy);

    let squarePoint = next_vec2();
    let cosTheta = sqrt(squarePoint.y);
    let sinTheta = sqrt(1.0 - squarePoint.y);
    let phi = TWO_PI * squarePoint.x;

    let direction = matrix * vec3(sinTheta * sin(phi), cosTheta, sinTheta * cos(phi)); 
    let pdf = ONE_BY_PI * cosTheta;
    return Direction(direction, pdf, 0.0, NULL);
}

fn diffusePDF(normal: vec3<f32>, direction: vec3<f32>) -> f32 {
    let cosTheta = max(dot(normal, direction), 0.0);
    return ONE_BY_PI * cosTheta;
}

fn lightDirection(lightId: u32, from: vec3<f32>, normal: vec3<f32>) -> Direction {
    if (lightId == NULL) {
        return diffuseDirection(normal);
    }

    let boxId = lightId >> 3u;
    let volume = boxes[boxId].volume;
    let size = volume.max - volume.min;
    let center = (volume.max + volume.min) * 0.5;

    let faceId = lightId & 7u;
    let lightNormal = normals[faceId];
    let matrix = mat3x3(lightNormal.zxy, abs(lightNormal.yzx), lightNormal);

    let to = (matrix * vec3(next_vec2() - vec2(0.5), 0.5)) * size + center;
    let fromTo = to - from;
    let distance = length(fromTo);
    let direction = fromTo / distance;

    let localSize = abs(size * matrix);
    let area = -localSize.x * localSize.y * dot(lightNormal, direction); 
    let pdf = distance * distance / area;

    return Direction(direction, diffusePDF(normal, direction), pdf, lightId);
}

fn lightPDF(lightId: u32, from: vec3<f32>, direction: Direction) -> f32 {
    if (lightId == NULL) {
        return direction.diffusePDF;
    }
    if (lightId == direction.lightId) {
        return direction.lightPDF;
    }

    let boxId = lightId >> 3u;
    let volume = boxes[boxId].volume;
    let size = volume.max - volume.min;
    let center = (volume.max + volume.min) * 0.5;

    let faceId = lightId & 7u;
    let lightNormal = normals[faceId];
    let matrix = mat3x3(lightNormal.zxy, abs(lightNormal.yzx), lightNormal);

    let localSize = abs(size * matrix);
    let faceCenter =  center + 0.5 * localSize.z * lightNormal; 

    let area = -localSize.x * localSize.y * dot(direction.direction, lightNormal);
    
    let localFrom = (from - faceCenter) * matrix;
    let localDirection = direction.direction * matrix;
    let distance = -localFrom.z / localDirection.z;
    
    let localTo = localFrom.xy + distance * localDirection.xy;
    let hit = area > 0.0 && all(abs(localTo) <= (localSize.xy * 0.5));

    return select(0.0, distance * distance  / area, hit);
}

fn importantDirection(importantLights: vec4<u32>, from: vec3<f32>, normal: vec3<f32>) -> Direction {
    let r = next_unorm() * 6.0 - 2.0;
    if (r < 0.0) {
        return diffuseDirection(normal);
    } else {
        let lightId = importantLights[i32(r)];
        return lightDirection(lightId, from, normal);
    }
}

fn importantPDF(importantLights: vec4<u32>, from: vec3<f32>, direction: Direction) -> f32 {
    return 0.333  * direction.diffusePDF + 0.167 * (
        lightPDF(importantLights[0], from, direction) +
        lightPDF(importantLights[1], from, direction) +
        lightPDF(importantLights[2], from, direction) +
        lightPDF(importantLights[3], from, direction)
    );
}

fn loadLights(boxId: u32, faceId: u32) -> vec4<u32> {
    let lightIds = &importantDirections[boxId].faces[faceId].lights;
    return vec4(
        atomicLoad(&(*lightIds)[0]),
        atomicLoad(&(*lightIds)[1]),
        atomicLoad(&(*lightIds)[2]),
        atomicLoad(&(*lightIds)[3]),
    );
}

fn diffuseRay(hitDetails: HitDetails) -> WeightedRay {
    let importantLights = loadLights(hitDetails.boxId, hitDetails.faceId);
    let normal = normals[hitDetails.faceId];
    let direction = importantDirection(importantLights, hitDetails.position, normal);
    let ray = newRay(hitDetails.position, direction.direction);
    let weight = direction.diffusePDF /  importantPDF(importantLights, hitDetails.position, direction);
    return WeightedRay(ray, weight, direction.lightId);
}

fn reflectionRay(hitDetails: HitDetails) -> WeightedRay {
    let normal = normals[hitDetails.faceId];
    let direction = reflect(hitDetails.ray.direction, normal);
    return WeightedRay(
        newRay(hitDetails.position, direction),
        1.0,
        NULL,
    );
}

fn scatterRay(hitDetails: HitDetails, material: vec4<f32>) -> WeightedRay {
    if (next_unorm() < material.w) {
        return diffuseRay(hitDetails);
    } else {
        return reflectionRay(hitDetails);
    }
}

// Ray Tracing

fn shootInGrid(ray: Ray) -> Hit {
    var t = traverser(ray);
    var range = vec2(EPSILON);
    var hit = Hit(NULL, range[1]);
    for (var i = 0; i < 128 && hit.boxId == NULL && all(t.cell != t.limit); i = i + 1) {
        let cell = grid[t.cell.x + t.cell.y + t.cell.z];
        range[1] = next(&t);
        hit = shoot(cell, ray, range);
    }
    return hit;
}

fn exchangeLight(boxId: u32, faceId: u32, oldLightId: u32, newLightId: u32) {
    let light = ((next_u32() + 0x7FFFFFu) >> 24u) & 3u;
    let lightPtr = &importantDirections[boxId].faces[faceId].lights[light];
    let result = atomicCompareExchangeWeak(lightPtr, oldLightId, newLightId);
    // if (result.old_value == oldLightId && !result.exchanged) {
    //     atomicStore(lightPtr, newLightId);
    // }
}

fn trace(ray: Ray) -> vec3<f32> {
    var color = vec3(1.0);
    var weightedRay = WeightedRay(ray, 1.0, NULL);
    var prevBoxId = NULL;
    var prevFaceId = NULL;
    for (var i = 0; i < 4; i = i + 1) {
        let hit = shootInGrid(weightedRay.ray);
        if (hit.boxId == NULL) {
            color = vec3(0.0);
            break;
        }
        let hitDetails = detailsOf(hit, weightedRay.ray);
        let material = materials[hitDetails.materialId];
        color = color * material.xyz * weightedRay.weight;
        if (material.w < 0.0) {
            if (weightedRay.lightId == NULL && prevBoxId != NULL) {
                let lightId = (hitDetails.boxId << 3u) | hitDetails.faceId;
                exchangeLight(prevBoxId, prevFaceId, NULL, lightId);
            }
            return color; 
        } else {
            if (weightedRay.lightId != NULL && prevBoxId != NULL) {
                let lightId = (hitDetails.boxId << 3u) | hitDetails.faceId;
                exchangeLight(prevBoxId, prevFaceId, lightId, NULL);
            }
        }
        prevBoxId = hitDetails.boxId;
        prevFaceId = hitDetails.faceId;
        weightedRay = scatterRay(hitDetails, material);
    }
    return color * 0.015625;
}

fn primaryRay(pixel: vec2<f32>) -> Ray {
    let direction = vec3(pixel, -uniforms.focalLength) * uniforms.matrix;
    return newRay(uniforms.position, direction);
}

// Integration

fn estimateColor(pixel: vec2<f32>) -> vec3<f32> {
    var c = vec3(0.0);
    for (var j = 0u; j < uniforms.samplesPerPixel; j = j + 1u) {
        c = c + trace(primaryRay(pixelSample(pixel)));
    };
    return c / f32(uniforms.samplesPerPixel);
}

// Main

fn init(vertex: Vertex) {
    seedRNG(vertex.position.xy);
    pixelSize = dpdy(vertex.xy.y);
}

@stage(fragment)
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    init(vertex);
    let c = estimateColor(vertex.xy);
    let m = max(c.x, max(c.y, c.z));
    return vec4(select(c, c / m, m > 1.0), 1.0);
}