uniform int effect;
uniform vec2 mousePos;
uniform sampler2D sampler;

const float PI = atan(0.0, -1.0);
const float PI2 = PI * PI;

bool inVisibleArea(vec2 pos) {
    vec2 absPos = abs(pos);
    float maxCoord = max(absPos.x, absPos.y);
    return maxCoord <= 1.0;
}

mat2 twist(float force) {
    return mat2(
        cos(force), sin(force), 
        -sin(force), cos(force)
    );
}

mat2 squeeze(float force) {
    return mat2(
        1.0 + force / PI, 0.0, 
        0.0, 1.0 + force / PI
    );
}

mat2 stretch(float force) {
    return mat2(
        1.0 / (1.0 + force / PI), 0.0, 
        0.0, 1.0 / (1.0 + force / PI)
    );
}

mat2 distort(float force) {
    if (effect == 0) {
        return twist(force);
    } else if (effect == 1) {
        return squeeze(force);
    } else if (effect == 2) {
        return stretch(force);
    } else {
        return mat2(1.0);
    }
}

vec4 colorAt(vec2 pos, float aspect, float pixelSize) {
    vec2 newPos = pos;

    if (inVisibleArea(mousePos)) {
        vec2 relPos = pos - mousePos;
        float distanceSquared = dot(relPos, relPos);
        if (effect < 3) {
            float force = PI * exp(-PI2 * distanceSquared);
            mat2 distortion = distort(force);
            newPos = distortion * relPos + mousePos;
        } else {
            float force = exp(PI2 * PI * (0.1 - distanceSquared));
            float distortion = force <= 1.0 ? (1.0 - force) : PI2 / distanceSquared;
            newPos = distortion * relPos + mousePos;
        }
    }

    if (inVisibleArea(newPos)) {
        vec2 texturePos = (newPos + vec2(1.0, -1.0)) / vec2(2.0, -2.0);
        return texture(sampler, texturePos);
    } else {
        return vec4(1.0);
    }

}