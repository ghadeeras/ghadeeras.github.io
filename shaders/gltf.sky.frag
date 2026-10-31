in vec3 direction;
out vec4 fragColor; 

uniform U_0_0 {
    mat4 globalPositionsMat;
    mat4 globalNormalsMat;
    mat4 projectionMat;
    vec4 lightPosition;
    vec4 color;
    float metalness;
    float roughness;
    vec3 emissive_factor;
    float alpha_cutoff;
};

uniform U_0_1 {
    uint clock;
};

// ####################################
// Pseudo Random Generation ... The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift

const float RND_PRECISION = 1.0 / float(0xFFFFFFFFu >> 10u);

uvec4 rng;

uint next_u32() {
    uint t = rng.w;
    uint s = rng.x;

    t = t ^ (t << 11u);
	  t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = uvec4(t ^ s, rng.xyz);
    return rng.x;
}

float next() {
    uint n = (next_u32() + 0x1FFu) >> 10u;
    return float(n) * RND_PRECISION;
}

void seedRNG(vec3 position) {
    uvec3 p = floatBitsToUint(position);
    rng = (p.xyzx * p.yzxy + p.zxyz * uvec4(3u, 5u, 7u, 11u) * clock) | uvec4(23u, 19u, 17u, 13u);
    next(); next(); next(); next();
}

// ####################################

vec3 srgb(vec3 color) {
    vec3 c = max(color, 0.0); 
    return mix(
        c * 12.92,
        1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), c)
    );
}


void main() {
    vec3 view_dir = normalize(direction);
    vec3 light_dir = normalize(lightPosition.xyz);
    float glow = pow(0.5 * dot(view_dir, light_dir) + 0.5, 64.0);

    seedRNG(view_dir);
    float dither = (next() - 0.5) / 128.0;

    fragColor = vec4(srgb(vec3(glow + dither)), 1.0);
}
