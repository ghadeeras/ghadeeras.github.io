(module

    (import "stack" "stack" (memory $stack 1))

    (import "stack" "allocate64" (func $allocate64 (param $size i32) (result i32)))

    ;; ##### Init #####

    (func $f64_vec2 (param $x f64) (param $y f64) (result i32)
        (call $f64_vec2_r (local.get $x) (local.get $y) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_r (param $x f64) (param $y f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (local.get $x))
        (f64.store offset=8 (local.get $result) (local.get $y))
        (local.get $result)
    )
        
    (func $f64_vec3 (param $x f64) (param $y f64) (param $z f64) (result i32)
        (call $f64_vec3_r (local.get $x) (local.get $y) (local.get $z) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_r (param $x f64) (param $y f64) (param $z f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (local.get $x))
        (f64.store offset=8 (local.get $result) (local.get $y))
        (f64.store offset=16 (local.get $result) (local.get $z))
        (local.get $result)
    )
        
    (func $f64_vec4 (param $x f64) (param $y f64) (param $z f64) (param $w f64) (result i32)
        (call $f64_vec4_r (local.get $x) (local.get $y) (local.get $z) (local.get $w) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_r (param $x f64) (param $y f64) (param $z f64) (param $w f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (local.get $x))
        (f64.store offset=8 (local.get $result) (local.get $y))
        (f64.store offset=16 (local.get $result) (local.get $z))
        (f64.store offset=24 (local.get $result) (local.get $w))
        (local.get $result)
    )
        
    (export "f64_vec2" (func $f64_vec2))
    (export "f64_vec2_r" (func $f64_vec2_r))
    (export "f64_vec3" (func $f64_vec3))
    (export "f64_vec3_r" (func $f64_vec3_r))
    (export "f64_vec4" (func $f64_vec4))
    (export "f64_vec4_r" (func $f64_vec4_r))

    ;; ##### Addition ##### 

    (func $f64_vec2_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec2_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec3_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.add
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec4_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.add
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (f64.store offset=24 (local.get $result) (f64.add
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec_add (param $size i32) (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec_add_r (local.get $size) (local.get $v1) (local.get $v2) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_add_r (param $size i32) (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.add
                (f64.load (i32.add (local.get $v1) (local.get $offset)))
                (f64.load (i32.add (local.get $v2) (local.get $offset)))
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_add" (func $f64_vec2_add))
    (export "f64_vec2_add_r" (func $f64_vec2_add_r))
    (export "f64_vec3_add" (func $f64_vec3_add))
    (export "f64_vec3_add_r" (func $f64_vec3_add_r))
    (export "f64_vec4_add" (func $f64_vec4_add))
    (export "f64_vec4_add_r" (func $f64_vec4_add_r))
    (export "f64_vec_add" (func $f64_vec_add))
    (export "f64_vec_add_r" (func $f64_vec_add_r))

    ;; ##### Subtraction ##### 

    (func $f64_vec2_sub (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec2_sub_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_sub_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.sub
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.sub
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_sub (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec3_sub_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_sub_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.sub
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.sub
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.sub
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_sub (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec4_sub_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_sub_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.sub
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.sub
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.sub
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (f64.store offset=24 (local.get $result) (f64.sub
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec_sub (param $size i32) (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec_sub_r (local.get $size) (local.get $v1) (local.get $v2) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_sub_r (param $size i32) (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.sub
                (f64.load (i32.add (local.get $v1) (local.get $offset)))
                (f64.load (i32.add (local.get $v2) (local.get $offset)))
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_sub" (func $f64_vec2_sub))
    (export "f64_vec2_sub_r" (func $f64_vec2_sub_r))
    (export "f64_vec3_sub" (func $f64_vec3_sub))
    (export "f64_vec3_sub_r" (func $f64_vec3_sub_r))
    (export "f64_vec4_sub" (func $f64_vec4_sub))
    (export "f64_vec4_sub_r" (func $f64_vec4_sub_r))
    (export "f64_vec_sub" (func $f64_vec_sub))
    (export "f64_vec_sub_r" (func $f64_vec_sub_r))

    ;; ##### Multiplication ##### 

    (func $f64_vec2_mul (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec2_mul_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_mul_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_mul (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec3_mul_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_mul_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.mul
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_mul (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec4_mul_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_mul_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.mul
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (f64.store offset=24 (local.get $result) (f64.mul
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec_mul (param $size i32) (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec_mul_r (local.get $size) (local.get $v1) (local.get $v2) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_mul_r (param $size i32) (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.mul
                (f64.load (i32.add (local.get $v1) (local.get $offset)))
                (f64.load (i32.add (local.get $v2) (local.get $offset)))
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_mul" (func $f64_vec2_mul))
    (export "f64_vec2_mul_r" (func $f64_vec2_mul_r))
    (export "f64_vec3_mul" (func $f64_vec3_mul))
    (export "f64_vec3_mul_r" (func $f64_vec3_mul_r))
    (export "f64_vec4_mul" (func $f64_vec4_mul))
    (export "f64_vec4_mul_r" (func $f64_vec4_mul_r))
    (export "f64_vec_mul" (func $f64_vec_mul))
    (export "f64_vec_mul_r" (func $f64_vec_mul_r))

    ;; ##### Division ##### 

    (func $f64_vec2_div (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec2_div_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_div_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_div (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec3_div_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_div_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.div
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_div (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec4_div_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_div_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.div
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (f64.store offset=24 (local.get $result) (f64.div
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec_div (param $size i32) (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec_div_r (local.get $size) (local.get $v1) (local.get $v2) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_div_r (param $size i32) (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.div
                (f64.load (i32.add (local.get $v1) (local.get $offset)))
                (f64.load (i32.add (local.get $v2) (local.get $offset)))
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_div" (func $f64_vec2_div))
    (export "f64_vec2_div_r" (func $f64_vec2_div_r))
    (export "f64_vec3_div" (func $f64_vec3_div))
    (export "f64_vec3_div_r" (func $f64_vec3_div_r))
    (export "f64_vec4_div" (func $f64_vec4_div))
    (export "f64_vec4_div_r" (func $f64_vec4_div_r))
    (export "f64_vec_div" (func $f64_vec_div))
    (export "f64_vec_div_r" (func $f64_vec_div_r))

    ;; ##### Scalar Multiplication ##### 

    (func $f64_vec2_scalar_mul (param $v i32) (param $s f64) (result i32)
        (call $f64_vec2_scalar_mul_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_scalar_mul_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_scalar_mul (param $v i32) (param $s f64) (result i32)
        (call $f64_vec3_scalar_mul_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_scalar_mul_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=16 (local.get $result) (f64.mul
            (f64.load offset=16 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_scalar_mul (param $v i32) (param $s f64) (result i32)
        (call $f64_vec4_scalar_mul_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_scalar_mul_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.mul
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.mul
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=16 (local.get $result) (f64.mul
            (f64.load offset=16 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=24 (local.get $result) (f64.mul
            (f64.load offset=24 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec_scalar_mul (param $size i32) (param $v i32) (param $s f64) (result i32)
        (call $f64_vec_scalar_mul_r (local.get $size) (local.get $v) (local.get $s) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_scalar_mul_r (param $size i32) (param $v i32) (param $s f64) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.mul
                (f64.load (i32.add (local.get $v) (local.get $offset)))
                (local.get $s)
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_scalar_mul" (func $f64_vec2_scalar_mul))
    (export "f64_vec2_scalar_mul_r" (func $f64_vec2_scalar_mul_r))
    (export "f64_vec3_scalar_mul" (func $f64_vec3_scalar_mul))
    (export "f64_vec3_scalar_mul_r" (func $f64_vec3_scalar_mul_r))
    (export "f64_vec4_scalar_mul" (func $f64_vec4_scalar_mul))
    (export "f64_vec4_scalar_mul_r" (func $f64_vec4_scalar_mul_r))
    (export "f64_vec_scalar_mul" (func $f64_vec_scalar_mul))
    (export "f64_vec_scalar_mul_r" (func $f64_vec_scalar_mul_r))

    ;; ##### Scalar Division ##### 

    (func $f64_vec2_scalar_div (param $v i32) (param $s f64) (result i32)
        (call $f64_vec2_scalar_div_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_scalar_div_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_scalar_div (param $v i32) (param $s f64) (result i32)
        (call $f64_vec3_scalar_div_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_scalar_div_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=16 (local.get $result) (f64.div
            (f64.load offset=16 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_scalar_div (param $v i32) (param $s f64) (result i32)
        (call $f64_vec4_scalar_div_r (local.get $v) (local.get $s) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_scalar_div_r (param $v i32) (param $s f64) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.div
            (f64.load offset=0 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=8 (local.get $result) (f64.div
            (f64.load offset=8 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=16 (local.get $result) (f64.div
            (f64.load offset=16 (local.get $v))
            (local.get $s)
        ))
        (f64.store offset=24 (local.get $result) (f64.div
            (f64.load offset=24 (local.get $v))
            (local.get $s)
        ))
        (local.get $result)
    )
    
    (func $f64_vec_scalar_div (param $size i32) (param $v i32) (param $s f64) (result i32)
        (call $f64_vec_scalar_div_r (local.get $size) (local.get $v) (local.get $s) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_scalar_div_r (param $size i32) (param $v i32) (param $s f64) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.div
                (f64.load (i32.add (local.get $v) (local.get $offset)))
                (local.get $s)
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_scalar_div" (func $f64_vec2_scalar_div))
    (export "f64_vec2_scalar_div_r" (func $f64_vec2_scalar_div_r))
    (export "f64_vec3_scalar_div" (func $f64_vec3_scalar_div))
    (export "f64_vec3_scalar_div_r" (func $f64_vec3_scalar_div_r))
    (export "f64_vec4_scalar_div" (func $f64_vec4_scalar_div))
    (export "f64_vec4_scalar_div_r" (func $f64_vec4_scalar_div_r))
    (export "f64_vec_scalar_div" (func $f64_vec_scalar_div))
    (export "f64_vec_scalar_div_r" (func $f64_vec_scalar_div_r))

    ;; ##### Dot Product ##### 

    (func $f64_vec2_dot (param $v1 i32) (param $v2 i32) (result f64)
        (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        )
        (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        )
        (f64.add)
    )
    
    (func $f64_vec3_dot (param $v1 i32) (param $v2 i32) (result f64)
        (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        )
        (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        )
        (f64.add)
        (f64.mul
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        )
        (f64.add)
    )
    
    (func $f64_vec4_dot (param $v1 i32) (param $v2 i32) (result f64)
        (f64.mul
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        )
        (f64.mul
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        )
        (f64.add)
        (f64.mul
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        )
        (f64.add)
        (f64.mul
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        )
        (f64.add)
    )
    
    (func $f64_vec_dot (param $size i32) (param $v1 i32) (param $v2 i32) (result f64)
        (local $result f64)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (local.set $result (f64.const 0.0))
        (loop $L
            (local.set $result (f64.add 
                (local.get $result) 
                (f64.mul
                    (f64.load (i32.add (local.get $v1) (local.get $offset)))
                    (f64.load (i32.add (local.get $v2) (local.get $offset)))
                )
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_dot" (func $f64_vec2_dot))
    (export "f64_vec3_dot" (func $f64_vec3_dot))
    (export "f64_vec4_dot" (func $f64_vec4_dot))
    (export "f64_vec_dot" (func $f64_vec_dot))

    ;; ##### Length ##### 

    (func $f64_vec2_length (param $v i32) (result f64)
        (f64.sqrt (call $f64_vec2_dot (local.get $v) (local.get $v)))
    )
    
    (func $f64_vec3_length (param $v i32) (result f64)
        (f64.sqrt (call $f64_vec3_dot (local.get $v) (local.get $v)))
    )
    
    (func $f64_vec4_length (param $v i32) (result f64)
        (f64.sqrt (call $f64_vec4_dot (local.get $v) (local.get $v)))
    )
    
    (func $f64_vec_length (param $size i32) (param $v i32) (result f64)
        (f64.sqrt (call $f64_vec_dot (local.get $size) (local.get $v) (local.get $v)))
    )
    
    (export "f64_vec2_length" (func $f64_vec2_length))
    (export "f64_vec3_length" (func $f64_vec3_length))
    (export "f64_vec4_length" (func $f64_vec4_length))
    (export "f64_vec_length" (func $f64_vec_length))

    ;; ##### Normalization ##### 

    (func $f64_vec2_normalize (param $v i32) (result i32)
        (call $f64_vec2_normalize_r (local.get $v) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_normalize_r (param $v i32) (param $result i32) (result i32)
        (call $f64_vec2_scalar_div_r 
            (local.get $v) 
            (call $f64_vec2_length (local.get $v)) 
            (local.get $result)
        )
    )
    
    (func $f64_vec3_normalize (param $v i32) (result i32)
        (call $f64_vec3_normalize_r (local.get $v) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_normalize_r (param $v i32) (param $result i32) (result i32)
        (call $f64_vec3_scalar_div_r 
            (local.get $v) 
            (call $f64_vec3_length (local.get $v)) 
            (local.get $result)
        )
    )
    
    (func $f64_vec4_normalize (param $v i32) (result i32)
        (call $f64_vec4_normalize_r (local.get $v) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_normalize_r (param $v i32) (param $result i32) (result i32)
        (call $f64_vec4_scalar_div_r 
            (local.get $v) 
            (call $f64_vec4_length (local.get $v)) 
            (local.get $result)
        )
    )
    
    (func $f64_vec_normalize (param $size i32) (param $v i32) (result i32)
        (call $f64_vec_normalize_r (local.get $size) (local.get $v) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_normalize_r (param $size i32) (param $v i32) (param $result i32) (result i32)
        (call $f64_vec_scalar_div_r 
            (local.get $size) 
            (local.get $v) 
            (call $f64_vec_length (local.get $size) (local.get $v)) 
            (local.get $result)
        )
    )
    
    (export "f64_vec2_normalize" (func $f64_vec2_normalize))
    (export "f64_vec2_normalize_r" (func $f64_vec2_normalize_r))
    (export "f64_vec3_normalize" (func $f64_vec3_normalize))
    (export "f64_vec3_normalize_r" (func $f64_vec3_normalize_r))
    (export "f64_vec4_normalize" (func $f64_vec4_normalize))
    (export "f64_vec4_normalize_r" (func $f64_vec4_normalize_r))
    (export "f64_vec_normalize" (func $f64_vec_normalize))
    (export "f64_vec_normalize_r" (func $f64_vec_normalize_r))

)