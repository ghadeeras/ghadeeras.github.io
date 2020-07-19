(module

    (import "stack" "stack" (memory $stack 1))
    (import "stack" "allocate64" (func $allocate64 (param i32) (result i32)))

    (func $vec2Set (param $ref i32) (param $x f64) (param $y f64) (result i32)
        (f64.store (local.get $ref) (local.get $x))
        (f64.store (i32.add (local.get $ref) (i32.const 8)) (local.get $y))
        (local.get $ref)
    )

    (func $vec3Set (param $ref i32) (param $x f64) (param $y f64) (param $z f64) (result i32)
        (f64.store (local.get $ref) (local.get $x))
        (f64.store (i32.add (local.get $ref) (i32.const 8)) (local.get $y))
        (f64.store (i32.add (local.get $ref) (i32.const 16)) (local.get $z))
        (local.get $ref)
    )

    (func $vec4Set (param $ref i32) (param $x f64) (param $y f64) (param $z f64) (param $w f64) (result i32)
        (f64.store (local.get $ref) (local.get $x))
        (f64.store (i32.add (local.get $ref) (i32.const 8)) (local.get $y))
        (f64.store (i32.add (local.get $ref) (i32.const 16)) (local.get $z))
        (f64.store (i32.add (local.get $ref) (i32.const 24)) (local.get $w))
        (local.get $ref)
    )

    (func $vec2 (param $x f64) (param $y f64) (result i32)
        (call $vec2Set (call $allocate64 (i32.const 2)) (local.get $x) (local.get $y))
    )

    (func $vec3 (param $x f64) (param $y f64) (param $z f64) (result i32)
        (call $vec3Set (call $allocate64 (i32.const 3)) (local.get $x) (local.get $y) (local.get $z))
    )

    (func $vec4 (param $x f64) (param $y f64) (param $z f64) (param $w f64) (result i32)
        (call $vec4Set (call $allocate64 (i32.const 4)) (local.get $x) (local.get $y) (local.get $z) (local.get $w))
    )

    (func $vec2Zero (result i32)
        (call $vec2 (f64.const 0) (f64.const 0))
    )

    (func $vec3Zero (result i32)
        (call $vec3 (f64.const 0) (f64.const 0) (f64.const 0))
    )

    (func $vec4Zero (result i32)
        (call $vec4 (f64.const 0) (f64.const 0) (f64.const 0) (f64.const 0))
    )

    (func $vec2Clone (param $ref i32) (result i32)
        (call $vec2
            (call $vecX (local.get $ref))
            (call $vecY (local.get $ref))
        )
    )

    (func $vec3Clone (param $ref i32) (result i32)
        (call $vec3
            (call $vecX (local.get $ref))
            (call $vecY (local.get $ref))
            (call $vecZ (local.get $ref))
        )
    )

    (func $vec4Clone (param $ref i32) (result i32)
        (call $vec4
            (call $vecX (local.get $ref))
            (call $vecY (local.get $ref))
            (call $vecZ (local.get $ref))
            (call $vecW (local.get $ref))
        )
    )

    (func $vec2Copy (param $src i32) (param $dst i32) (result i32)
        (call $vec2Set
            (local.get $dst)
            (call $vecX (local.get $src))
            (call $vecY (local.get $src))
        )
    )

    (func $vec3Copy (param $src i32) (param $dst i32) (result i32)
        (call $vec3Set
            (local.get $dst)
            (call $vecX (local.get $src))
            (call $vecY (local.get $src))
            (call $vecZ (local.get $src))
        )
    )

    (func $vec4Copy (param $src i32) (param $dst i32) (result i32)
        (call $vec4Set
            (local.get $dst)
            (call $vecX (local.get $src))
            (call $vecY (local.get $src))
            (call $vecZ (local.get $src))
            (call $vecW (local.get $src))
        )
    )

    (func $vec2Swizzle (param $ref i32) (param $x i32) (param $y i32) (result i32)
        (call $vec2
            (call $vecGet (local.get $ref) (local.get $x))
            (call $vecGet (local.get $ref) (local.get $y))
        )
    )

    (func $vec3Swizzle (param $ref i32) (param $x i32) (param $y i32) (param $z i32) (result i32)
        (call $vec3
            (call $vecGet (local.get $ref) (local.get $x))
            (call $vecGet (local.get $ref) (local.get $y))
            (call $vecGet (local.get $ref) (local.get $z))
        )
    )

    (func $vec4Swizzle (param $ref i32) (param $x i32) (param $y i32) (param $z i32) (param $w i32) (result i32)
        (call $vec4
            (call $vecGet (local.get $ref) (local.get $x))
            (call $vecGet (local.get $ref) (local.get $y))
            (call $vecGet (local.get $ref) (local.get $z))
            (call $vecGet (local.get $ref) (local.get $w))
        )
    )

    (func $vecGet (param $ref i32) (param $component i32) (result f64)
        (f64.load (i32.add (local.get $ref) (i32.shl (local.get $component) (i32.const 3)))) 
    )

    (func $vecX (param $ref i32) (result f64)
        (f64.load (local.get $ref)) 
    )

    (func $vecY (param $ref i32) (result f64)
        (f64.load (i32.add (local.get $ref) (i32.const 8))) 
    )

    (func $vecZ (param $ref i32) (result f64)
        (f64.load (i32.add (local.get $ref) (i32.const 16))) 
    )

    (func $vecW (param $ref i32) (result f64)
        (f64.load (i32.add (local.get $ref) (i32.const 24))) 
    )

    (func $vec2Add (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec2
            (f64.add (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.add (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
        )
    )

    (func $vec3Add (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec3
            (f64.add (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.add (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
            (f64.add (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
        )
    )

    (func $vec4Add (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec4
            (f64.add (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.add (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
            (f64.add (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
            (f64.add (call $vecW (local.get $vec1)) (call $vecW (local.get $vec2)))
        )
    )

    (func $vec2Sub (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec2
            (f64.sub (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.sub (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
        )
    )

    (func $vec3Sub (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec3
            (f64.sub (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.sub (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
            (f64.sub (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
        )
    )

    (func $vec4Sub (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec4
            (f64.sub (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
            (f64.sub (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
            (f64.sub (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
            (f64.sub (call $vecW (local.get $vec1)) (call $vecW (local.get $vec2)))
        )
    )

    (func $vec2Scale (param $vec i32) (param $factor f64) (result i32)
        (call $vec2
            (f64.mul (call $vecX (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecY (local.get $vec)) (local.get $factor))
        )
    )

    (func $vec3Scale (param $vec i32) (param $factor f64) (result i32)
        (call $vec3
            (f64.mul (call $vecX (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecY (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecZ (local.get $vec)) (local.get $factor))
        )
    )

    (func $vec4Scale (param $vec i32) (param $factor f64) (result i32)
        (call $vec4
            (f64.mul (call $vecX (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecY (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecZ (local.get $vec)) (local.get $factor))
            (f64.mul (call $vecW (local.get $vec)) (local.get $factor))
        )
    )

    (func $vec2Dot (param $vec1 i32) (param $vec2 i32) (result f64)
        (f64.mul (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
        (f64.mul (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
        (f64.add)
    )

    (func $vec3Dot (param $vec1 i32) (param $vec2 i32) (result f64)
        (f64.mul (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
        (f64.mul (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
        (f64.add)
        (f64.mul (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
        (f64.add)
    )

    (func $vec4Dot (param $vec1 i32) (param $vec2 i32) (result f64)
        (f64.mul (call $vecX (local.get $vec1)) (call $vecX (local.get $vec2)))
        (f64.mul (call $vecY (local.get $vec1)) (call $vecY (local.get $vec2)))
        (f64.add)
        (f64.mul (call $vecZ (local.get $vec1)) (call $vecZ (local.get $vec2)))
        (f64.add)
        (f64.mul (call $vecW (local.get $vec1)) (call $vecW (local.get $vec2)))
        (f64.add)
    )

    (func $vec2Cross (param $vec1 i32) (param $vec2 i32) (result f64)
        (f64.mul (call $vecX (local.get $vec1)) (call $vecY (local.get $vec2)))
        (f64.mul (call $vecY (local.get $vec1)) (call $vecX (local.get $vec2)))
        (f64.sub)
    )

    (func $vec3Cross (param $vec1 i32) (param $vec2 i32) (result i32)
        (call $vec3
            (call $vec2Cross 
                (call $vec2Swizzle (local.get $vec1) (i32.const 1) (i32.const 2))
                (call $vec2Swizzle (local.get $vec2) (i32.const 1) (i32.const 2))
            )
            (call $vec2Cross 
                (call $vec2Swizzle (local.get $vec1) (i32.const 2) (i32.const 0))
                (call $vec2Swizzle (local.get $vec2) (i32.const 2) (i32.const 0))
            )
            (call $vec2Cross 
                (call $vec2Swizzle (local.get $vec1) (i32.const 0) (i32.const 1))
                (call $vec2Swizzle (local.get $vec2) (i32.const 0) (i32.const 1))
            )
        )
    )

    (func $vec2LengthSquared (param $vec i32) (result f64)
        (local $c f64)
        (f64.mul (local.tee $c (call $vecX (local.get $vec))) (local.get $c))
        (f64.mul (local.tee $c (call $vecY (local.get $vec))) (local.get $c))
        (f64.add)
    )

    (func $vec3LengthSquared (param $vec i32) (result f64)
        (local $c f64)
        (f64.mul (local.tee $c (call $vecX (local.get $vec))) (local.get $c))
        (f64.mul (local.tee $c (call $vecY (local.get $vec))) (local.get $c))
        (f64.add)
        (f64.mul (local.tee $c (call $vecZ (local.get $vec))) (local.get $c))
        (f64.add)
    )

    (func $vec4LengthSquared (param $vec i32) (result f64)
        (local $c f64)
        (f64.mul (local.tee $c (call $vecX (local.get $vec))) (local.get $c))
        (f64.mul (local.tee $c (call $vecY (local.get $vec))) (local.get $c))
        (f64.add)
        (f64.mul (local.tee $c (call $vecZ (local.get $vec))) (local.get $c))
        (f64.add)
        (f64.mul (local.tee $c (call $vecW (local.get $vec))) (local.get $c))
        (f64.add)
    )

    (func $vec2Length (param $vec i32) (result f64)
        (f64.sqrt (call $vec2LengthSquared (local.get $vec)))
    )

    (func $vec3Length (param $vec i32) (result f64)
        (f64.sqrt (call $vec3LengthSquared (local.get $vec)))
    )

    (func $vec4Length (param $vec i32) (result f64)
        (f64.sqrt (call $vec4LengthSquared (local.get $vec)))
    )

    (func $vec2Unit (param $vec i32) (result i32)
        (call $vec2Scale (local.get $vec) (f64.div (f64.const 1) (call $vec2Length (local.get $vec))))
    )

    (func $vec3Unit (param $vec i32) (result i32)
        (call $vec3Scale (local.get $vec) (f64.div (f64.const 1) (call $vec3Length (local.get $vec))))
    )

    (func $vec4Unit (param $vec i32) (result i32)
        (call $vec4Scale (local.get $vec) (f64.div (f64.const 1) (call $vec4Length (local.get $vec))))
    )

    (export "vec2Set" (func $vec2Set))
    (export "vec3Set" (func $vec3Set))
    (export "vec4Set" (func $vec4Set))

    (export "vec2" (func $vec2))
    (export "vec3" (func $vec3))
    (export "vec4" (func $vec4))

    (export "vec2Clone" (func $vec2Clone))
    (export "vec3Clone" (func $vec3Clone))
    (export "vec4Clone" (func $vec4Clone))

    (export "vec2Copy" (func $vec2Copy))
    (export "vec3Copy" (func $vec3Copy))
    (export "vec4Copy" (func $vec4Copy))

    (export "vec2Swizzle" (func $vec2Swizzle))
    (export "vec3Swizzle" (func $vec3Swizzle))
    (export "vec4Swizzle" (func $vec4Swizzle))

    (export "vecX" (func $vecX))
    (export "vecY" (func $vecY))
    (export "vecZ" (func $vecZ))
    (export "vecW" (func $vecW))

    (export "vec2Add" (func $vec2Add))
    (export "vec3Add" (func $vec3Add))
    (export "vec4Add" (func $vec4Add))

    (export "vec2Sub" (func $vec2Sub))
    (export "vec3Sub" (func $vec3Sub))
    (export "vec4Sub" (func $vec4Sub))

    (export "vec2Scale" (func $vec2Scale))
    (export "vec3Scale" (func $vec3Scale))
    (export "vec4Scale" (func $vec4Scale))

    (export "vec2Dot" (func $vec2Dot))
    (export "vec3Dot" (func $vec3Dot))
    (export "vec4Dot" (func $vec4Dot))

    (export "vec2Cross" (func $vec2Cross))
    (export "vec3Cross" (func $vec3Cross))

    (export "vec2LengthSquared" (func $vec2LengthSquared))
    (export "vec3LengthSquared" (func $vec3LengthSquared))
    (export "vec4LengthSquared" (func $vec4LengthSquared))

    (export "vec2Length" (func $vec2Length))
    (export "vec3Length" (func $vec3Length))
    (export "vec4Length" (func $vec4Length))

    (export "vec2Unit" (func $vec2Unit))
    (export "vec3Unit" (func $vec3Unit))
    (export "vec4Unit" (func $vec4Unit))

)