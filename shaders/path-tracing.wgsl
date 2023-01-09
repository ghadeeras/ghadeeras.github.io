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

@vertex
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

struct Cell {
    boxes: array<u32, 8>,
    size: u32,
}

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

const EPSILON: f32 = 0x1P-11;
const RND_PRECISION: f32 = 0x1P-22;
const MAX_BOXES_PER_CELL: u32 = 8u;
const GRID_LIMIT_LO: vec3<i32> = vec3<i32>(-4096, -64, -1);
const GRID_LIMIT_HI: vec3<i32> = vec3<i32>(262144, 4096, 64);
const GRID_BITS_SHIFT: vec3<u32> = vec3<u32>(12u, 6u, 0u);
const ZERO_F3D = vec3(0.0);
const ZERO_I3D = vec3(0);
const NIL: u32 = 0xFFFFFFFFu;
const OBSERVER: u32 = 0x7FFFFFFFu;
const OBSERVER_RADIUS: f32 = 0.5;
const OBSERVER_RADIUS_SQUARED: f32 = 0.25;
const TWO_PI = 6.283185307179586476925286766559;
const ONE_BY_PI = 0.31830988618379067153776752674503;

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
    normal: vec3<f32>,
    material: vec4<f32>,
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

fn shoot(cell: Cell, ray: Ray, nearestHit: Hit) -> Hit {
    var range = vec2(EPSILON, nearestHit.distance);
    var nearestBoxId = nearestHit.boxId;
    for (var i = 0u; i < cell.size; i = i + 1u) {
        let boxId = cell.boxes[i];
        let newR = hitRange(boxes[boxId].volume, ray, range);
        let hit = newR[0] < newR[1]; 
        range[1] = select(range[1], newR[0], hit);
        nearestBoxId = select(nearestBoxId, boxId, hit);
    }
    return Hit(nearestBoxId, range[1]);
}

fn detailsOf(hit: Hit, ray: Ray) -> HitDetails {
    let position = ray.origin + ray.direction * hit.distance;
    if (hit.boxId == OBSERVER) {
        let normal = normalize(position - uniforms.position);
        let axis = vec3(uniforms.matrix[0][2], uniforms.matrix[1][2], uniforms.matrix[2][2]);
        let cosTheta = -dot(normal, axis);
        let color = select(vec3(1.0), select(vec3(0.5, 0.5, 1.0), ZERO_F3D, cosTheta > 0.95), cosTheta > 0.8);
        return HitDetails(ray, position, normal, vec4(color, 0.75), OBSERVER, NIL);
    } else {
        let box = boxes[hit.boxId];
        let faceId = faceIdOf(box.volume, position);
        let materialId = box.faceMaterials[faceId];
        return HitDetails(ray, position, normals[faceId], materials[materialId], hit.boxId, faceId);
    }
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
    let step = vec3<i32>(direction) << GRID_BITS_SHIFT; 
    let rearCorner = max(-direction, ZERO_F3D);
    let limit = select(GRID_LIMIT_LO, GRID_LIMIT_HI, step > ZERO_I3D);
    let distance = (rearCorner - fract(ray.origin)) * ray.invDirection; 
    let cell = vec3<i32>(ray.origin) << GRID_BITS_SHIFT;
    return Traverser(ray, step, limit, distance, cell);
}

fn next(t: ptr<function, Traverser>) -> f32 {
    let next = (*t).distance + abs((*t).ray.invDirection);
    let result = min(next.x, min(next.y, next.z));
    let closest = (next == vec3(result));
    (*t).distance = select((*t).distance, next, closest);
    (*t).cell = (*t).cell + select(ZERO_I3D, (*t).step, closest);
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
    reflection: bool,
} 

fn pixelSample(pixel: vec2<f32>) -> vec2<f32> {
    return pixel + next_vec2() * pixelSize;
}

fn alignedWithY(u: vec3<f32>) -> mat3x3<f32> {
        let v = select(u.zxy, normalize(vec3(u.x, -2.0 * u.y, u.z)), dot(u, u.zxy) > 0.9375);
        let uu = normalize(u);
        let vv = normalize(v - dot(uu, v) * uu);
        return mat3x3(cross(uu, vv), uu, vv);
}

fn diffuseDirection(normal: vec3<f32>) -> Direction {
    let matrix: mat3x3<f32> = alignedWithY(normal);

    let squarePoint = next_vec2();
    let cosTheta = sqrt(squarePoint.y);
    let sinTheta = sqrt(1.0 - squarePoint.y);
    let phi = TWO_PI * squarePoint.x;

    let direction = matrix * vec3(sinTheta * sin(phi), cosTheta, sinTheta * cos(phi)); 
    let pdf = ONE_BY_PI * cosTheta;
    return Direction(direction, pdf, 0.0, NIL);
}

fn diffusePDF(normal: vec3<f32>, direction: vec3<f32>) -> f32 {
    let cosTheta = max(dot(normal, direction), 0.0);
    return ONE_BY_PI * cosTheta;
}

fn lightDirection(lightId: u32, fromSP: vec3<f32>, normal: vec3<f32>) -> Direction {
    let boxId = lightId >> 3u;
    let volume = boxes[boxId].volume;
    let size = volume.max - volume.min;
    let center = (volume.max + volume.min) * 0.5;

    let faceId = lightId & 7u;
    let lightNormal = normals[faceId];
    let matrix = mat3x3(lightNormal.zxy, abs(lightNormal.yzx), lightNormal);

    let to = (matrix * vec3(next_vec2() - vec2(0.5), 0.5)) * size + center;
    let fromTo = to - fromSP;
    let distanceSquared = dot(fromTo, fromTo);
    let direction = fromTo / sqrt(distanceSquared);

    let localSize = abs(size * matrix);
    let area = -localSize.x * localSize.y * dot(lightNormal, direction); 
    let pdf = distanceSquared / area;

    return Direction(direction, diffusePDF(normal, direction), pdf, lightId);
}

fn lightPDF(lightId: u32, fromSP: vec3<f32>, direction: Direction) -> f32 {
    if ((lightId == NIL) | (lightId == direction.lightId)) {
        return select(direction.lightPDF, direction.diffusePDF, lightId == NIL);
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
    
    let localFrom = (fromSP - faceCenter) * matrix;
    let localDirection = direction.direction * matrix;
    let distance = -localFrom.z / localDirection.z;
    
    let localTo = localFrom.xy + distance * localDirection.xy;
    let hit = (area > 0.0) & all(abs(localTo) <= (localSize.xy * 0.5));

    return select(0.0, distance * distance  / area, hit);
}

fn importantDirection(importantLights: vec4<u32>, fromSP: vec3<f32>, normal: vec3<f32>, firstHit: bool) -> Direction {
    let bias = select(0.0, 1.0, firstHit);
    let r = next_unorm() * (4.0 + bias) - bias;
    let lightId = importantLights[i32(r) & 3];
    if ((r < 0.0) | (lightId == NIL)) {
        return diffuseDirection(normal);
    } else {
        return lightDirection(lightId, fromSP, normal);
    }
}

fn importantPDF(importantLights: vec4<u32>, fromSP: vec3<f32>, direction: Direction, firstHit: bool) -> f32 {
    let weights = select(vec2(0.0, 0.25), vec2(0.2, 0.2), firstHit);
    return weights[0]  * direction.diffusePDF + weights[1] * (
        lightPDF(importantLights[0], fromSP, direction) +
        lightPDF(importantLights[1], fromSP, direction) +
        lightPDF(importantLights[2], fromSP, direction) +
        lightPDF(importantLights[3], fromSP, direction)
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

fn diffuseRay(hitDetails: HitDetails, firstHit: bool) -> WeightedRay {
    if (hitDetails.boxId == OBSERVER) {
        let direction = diffuseDirection(hitDetails.normal);
        let ray = newRay(hitDetails.position, direction.direction);
        return WeightedRay(ray, 1.0, NIL, false);
    } else {
        let importantLights = loadLights(hitDetails.boxId, hitDetails.faceId);
        let direction = importantDirection(importantLights, hitDetails.position, hitDetails.normal, firstHit);
        let ray = newRay(hitDetails.position, direction.direction);
        let weight = direction.diffusePDF /  importantPDF(importantLights, hitDetails.position, direction, firstHit);
        return WeightedRay(ray, weight, direction.lightId, false);
    }
}

fn reflectionRay(hitDetails: HitDetails) -> WeightedRay {
    let direction = reflect(hitDetails.ray.direction, hitDetails.normal);
    return WeightedRay(
        newRay(hitDetails.position, direction),
        1.0,
        NIL,
        true
    );
}

fn scatterRay(hitDetails: HitDetails, firstHit: bool) -> WeightedRay {
    if (next_unorm() < hitDetails.material.w) {
        return diffuseRay(hitDetails, firstHit);
    } else {
        return reflectionRay(hitDetails);
    }
}

// Ray Tracing

fn shootObserver(ray: Ray) -> Hit {
    let observerRelativePosition = uniforms.position - ray.origin;
    let observerRelativeDistanceSquared = dot(observerRelativePosition, observerRelativePosition);
    let halfB = dot(ray.direction, observerRelativePosition);
    let c = observerRelativeDistanceSquared - OBSERVER_RADIUS_SQUARED;
    let d = halfB * halfB - c;
    let sqrtD = select(halfB, sqrt(d), d > 0.0);
    let distance = halfB - sqrtD;
    let hit = distance > 0.0; 
    return Hit(select(NIL, OBSERVER, hit), select(128.0, distance, hit));
}

fn shootInGrid(ray: Ray) -> Hit {
    var t = traverser(ray);
    var hit = shootObserver(ray);
    var done = false;
    for (var i = 0; (i < 128) & !done; i = i + 1) {
        let cell = grid[t.cell.x + t.cell.y + t.cell.z];
        let distance = next(&t);
        hit = shoot(cell, ray, hit);
        done = (hit.boxId < OBSERVER) | any(t.cell == t.limit) | (distance >= hit.distance);
    }
    return hit;
}

fn exchangeLight(boxId: u32, faceId: u32, oldLightId: u32, newLightId: u32) {
    let lightsPtr = &importantDirections[boxId].faces[faceId].lights;
    let i = (next_u32() >> 10u) & 3u;
    let lightPtr = &(*lightsPtr)[i];
    atomicCompareExchangeWeak(lightPtr, oldLightId, newLightId);
}

struct Result {
    color: vec3<f32>,
    normal: vec4<f32>,
}

fn trace(ray: Ray) -> Result {
    var color = vec3(1.0);
    var weightedRay = WeightedRay(ray, 1.0, NIL, false);
    var prevBoxId = NIL;
    var prevFaceId = NIL;
    var normal = vec4(0.0);
    var reflection = true;
    for (var i = 0; i < 4; i = i + 1) {
        let hit = shootInGrid(weightedRay.ray);
        if (hit.boxId == NIL) {
            return Result(ZERO_F3D, select(normal, vec4(-ray.direction, 128.0), i == 0));
        }
        let hitDetails = detailsOf(hit, weightedRay.ray);
        normal = select(normal, vec4(reflect(hitDetails.normal, normal.xyz), normal.w + hit.distance), reflection | (i == 0));
        color = color * hitDetails.material.xyz * weightedRay.weight;
        if (hitDetails.material.w < 0.0) {
            if ((weightedRay.lightId == NIL) & (prevBoxId < OBSERVER)) {
                let lightId = (hitDetails.boxId << 3u) | hitDetails.faceId;
                exchangeLight(prevBoxId, prevFaceId, NIL, lightId);
            }
            return Result(color, normal); 
        } else {
            if ((weightedRay.lightId != NIL) & (prevBoxId < OBSERVER)) {
                let lightId = (hitDetails.boxId << 3u) | hitDetails.faceId;
                exchangeLight(prevBoxId, prevFaceId, lightId, NIL);
            }
        }
        prevBoxId = hitDetails.boxId;
        prevFaceId = hitDetails.faceId;
        weightedRay = scatterRay(hitDetails, reflection);
        reflection &= weightedRay.reflection;
    }
    return Result(ZERO_F3D, normal);
}

fn primaryRay(pixel: vec2<f32>) -> Ray {
    let direction = vec3(pixel, -uniforms.focalLength) * uniforms.matrix;
    return newRay(uniforms.position, normalize(direction));
}

// Integration

fn estimateColor(pixel: vec2<f32>) -> Result {
    var c = ZERO_F3D;
    var n = vec4(0.0);
    for (var j = 0u; j < uniforms.samplesPerPixel; j = j + 1u) {
        let r = trace(primaryRay(pixelSample(pixel)));
        c = c + r.color;
        n = n + r.normal;
    };
    let invSPP = 1.0 / f32(uniforms.samplesPerPixel);
    return Result(c * invSPP, n * invSPP);
}

// Main

fn init(vertex: Vertex) {
    seedRNG(vertex.position.xy);
    pixelSize = dpdy(vertex.xy.y);
}

struct Output {
    @location(0) color: vec4<f32>,
    @location(1) normal: vec4<f32>,
}

@fragment
fn f_main(vertex: Vertex) -> Output {
    init(vertex);
    let r = estimateColor(vertex.xy);

    // Guard against NaNs
    let c = max(r.color, ZERO_F3D);
    let n = clamp(r.normal, vec4(-1.0, -1.0, -1.0, 0.0), vec4(1.0, 1.0, 1.0, 128.0));

    let m = max(c.r, max(c.g, c.b));
    return Output(
        vec4(select(c, c / m, m > 1.0), 1.0 / (n.w + 1.0)), 
        vec4((1.0 + n.xzy) * 0.5, n.w),
    );
}