struct BodyDesc {
    mass: f32,
    radius: f32,
};

struct BodyState {
    position: vec3<f32>,
    velocity: vec3<f32>,
};

struct UniverseUniforms {
    bodyFluffiness: f32,
    gravityConstant: f32,
    dT: f32,
};

struct UniverseDesc {
    bodies: array<BodyDesc>,
};

struct UniverseState {
    bodies: array<BodyState>,
};

@group(0)
@binding(0)
var<storage, read> universeDesc: UniverseDesc;

@group(0)
@binding(1)
var<storage, read> currentState: UniverseState;

@group(0)
@binding(2)
var<storage, read_write> nextState: UniverseState;

@group(0)
@binding(3)
var<uniform> universeUniforms: UniverseUniforms;

fn calculateBodiesCount() -> u32 {
    return min(
        arrayLength(&universeDesc.bodies), 
        min(
            arrayLength(&currentState.bodies), 
            arrayLength(&nextState.bodies)
        )
    );
}

fn accelerationFrom(body: BodyDesc, bodyPosition: vec3<f32>, position: vec3<f32>) -> vec3<f32> {
    let posToBody = bodyPosition - position;
    let distance = length(posToBody);
    let safeDistance = body.radius * universeUniforms.bodyFluffiness + distance;
    let proximity = 1.0 / safeDistance;
    let direction = posToBody * proximity;
    let acceleration = (universeUniforms.gravityConstant * proximity) * (body.mass * proximity);
    return acceleration * direction;
}

fn accelerationAt(position: vec3<f32>, bodiesCount: u32) -> vec3<f32> {
    var acceleration = vec3<f32>(0.0, 0.0, 0.0);
    for (var i = 0u; i < bodiesCount; i = i + 1u) {
        let body = universeDesc.bodies[i];
        if (body.mass <= 0.0) {
            continue;
        }
        let bodyState = currentState.bodies[i];
        acceleration = acceleration + accelerationFrom(body, bodyState.position, position);
    }
    return acceleration;
}

@compute
@workgroup_size([[workgroup_size]])
fn c_main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {
    let bodiesCount = calculateBodiesCount();

    let index = global_invocation_id.x; 
    if (index >= bodiesCount) {
        return;
    }

    let body = universeDesc.bodies[index];
    if (body.mass <= 0.0) {
        return;
    }

    let bodyState = currentState.bodies[index];

    let dV = accelerationAt(bodyState.position, bodiesCount) * universeUniforms.dT;
    let dP = (0.5 * dV + bodyState.velocity) * universeUniforms.dT; 
    nextState.bodies[index] = BodyState(
        bodyState.position + dP, 
        bodyState.velocity + dV 
    );
}
