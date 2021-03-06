(module
    
    (import "mem" "stack" (memory $stack 1))
    (import "mem" "enter" (func $enter))
    (import "mem" "leave" (func $leave))
    (import "mem" "allocate32" (func $allocate32 (param i32) (result i32)))

    (import "space" "f64_vec3_add" (func $vec3Add (param $v1 i32) (param $v2 i32) (result i32)))
    (import "space" "f64_vec3_scalar_mul" (func $vec3Scale (param $v i32) (param $factor f64) (result i32)))

    (func $f64_vec3_demote_copy (param $src i32) (param $dst i32) (result i32)
        (f32.store offset=0 (local.get $dst) (f32.demote_f64 (f64.load offset=0 (local.get $src))))
        (f32.store offset=4 (local.get $dst) (f32.demote_f64 (f64.load offset=8 (local.get $src))))
        (f32.store offset=8 (local.get $dst) (f32.demote_f64 (f64.load offset=16 (local.get $src))))
        (local.get $dst)
    )

    (func $f32_vec3_clone (param $v i32) (result i32)
        (local $result i32)
        (local.set $result (call $allocate32 (i32.const 3)))
        (f32.store offset=0 (local.get $result) (f32.load offset=0 (local.get $v)))
        (f32.store offset=4 (local.get $result) (f32.load offset=4 (local.get $v)))
        (f32.store offset=8 (local.get $result) (f32.load offset=8 (local.get $v)))
        (local.get $result)
    )

    (func $tesselateScalarField (param $fieldRef i32) (param $resolution i32) (param $contourValue f64) (result i32)
        (local $point000 i32) 
        (local $delta001 i32) 
        (local $delta010 i32) 
        (local $delta011 i32) 
        (local $delta100 i32) 
        (local $delta101 i32) 
        (local $delta110 i32) 
        (local $delta111 i32)
        (local $x i32)
        (local $y i32)
        (local $z i32)

        (local.set $delta100 (i32.const 64)) 
        (local.set $delta010 (i32.mul (local.get $delta100) (i32.add (local.get $resolution) (i32.const 1)))) 
        (local.set $delta001 (i32.mul (local.get $delta010) (i32.add (local.get $resolution) (i32.const 1))))
        (local.set $delta011 (i32.add (local.get $delta010) (local.get $delta001))) 
        (local.set $delta101 (i32.add (local.get $delta100) (local.get $delta001))) 
        (local.set $delta110 (i32.add (local.get $delta100) (local.get $delta010))) 
        (local.set $delta111 (i32.add (local.get $delta101) (local.get $delta010)))

        (local.set $point000 (local.get $fieldRef)) 
        (call $noTriangles)

        (local.set $z (i32.const 0))
        (loop $nextZ

            (local.set $y (i32.const 0))
            (loop $nextY

                (local.set $x (i32.const 0))
                (loop $nextX
                    
                    (drop (call $tessellateCube
                        (local.get $contourValue)
                        (local.get $point000)
                        (i32.add (local.get $point000) (local.get $delta001))
                        (i32.add (local.get $point000) (local.get $delta010))
                        (i32.add (local.get $point000) (local.get $delta011))
                        (i32.add (local.get $point000) (local.get $delta100))
                        (i32.add (local.get $point000) (local.get $delta101))
                        (i32.add (local.get $point000) (local.get $delta110))
                        (i32.add (local.get $point000) (local.get $delta111))
                    ))

                    (local.set $point000 (i32.add (local.get $point000) (local.get $delta100)))
                    (local.set $x (i32.add (local.get $x) (i32.const 1)))
                    (br_if $nextX (i32.lt_u (local.get $x) (local.get $resolution)))
                )
                (local.set $point000 (i32.add (local.get $point000) (local.get $delta100)))

                (local.set $y (i32.add (local.get $y) (i32.const 1)))
                (br_if $nextY (i32.lt_u (local.get $y) (local.get $resolution)))
            )
            (local.set $point000 (i32.add (local.get $point000) (local.get $delta010)))

            (local.set $z (i32.add (local.get $z) (i32.const 1)))
            (br_if $nextZ (i32.lt_u (local.get $z) (local.get $resolution)))
        )
    )

    (func $tessellateCube 
        (param $contourValue f64) 
        (param $point000 i32) 
        (param $point001 i32) 
        (param $point010 i32) 
        (param $point011 i32) 
        (param $point100 i32) 
        (param $point101 i32) 
        (param $point110 i32) 
        (param $point111 i32) 
        (result i32)
        (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point100) (local.get $point110))
        (drop 
            (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point110) (local.get $point010))
        )
        (drop 
            (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point010) (local.get $point011))
        )
        (drop 
            (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point011) (local.get $point001))
        )
        (drop 
            (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point001) (local.get $point101))
        )
        (drop 
            (call $tessellateTetrahedron (local.get $contourValue) (local.get $point111) (local.get $point000) (local.get $point101) (local.get $point100))
        )
    )

    (func $tessellateTetrahedron 
        (param $contourValue f64) 
        (param $point0 i32) 
        (param $point1 i32) 
        (param $point2 i32) 
        (param $point3 i32) 
        (result i32)

        (local $pattern i32)
        (local $inverse i32)
        (local $first i32)

        (local.set $inverse (i32.const 0))
        (local.set $pattern (call $calculatePattern 
            (local.get $contourValue) 
            (local.get $point0) 
            (local.get $point1) 
            (local.get $point2) 
            (local.get $point3)
        ))

        (if (i32.gt_u (i32.popcnt (local.get $pattern)) (i32.const 2))
            (then
                (local.set $inverse (i32.const 1))
                (local.set $pattern (i32.xor (local.get $pattern) (i32.const 0xF)))
            )
        )

        (if (i32.and (local.get $pattern) (i32.const 1))
            (return (call $doTessellateTetrahedron 
                (local.get $contourValue) 
                (local.get $point0) 
                (local.get $point1) 
                (local.get $point2) 
                (local.get $point3)
                (local.get $pattern)
                (local.get $inverse)
            ))
        )
        (if (i32.and (local.get $pattern) (i32.const 2))
            (return (call $doTessellateTetrahedron 
                (local.get $contourValue) 
                (local.get $point1) 
                (local.get $point0) 
                (local.get $point3)
                (local.get $point2) 
                (call $bits (local.get $pattern) (i32.const 1) (i32.const 0) (i32.const 3) (i32.const 2))
                (local.get $inverse)
            ))
        )
        (if (i32.and (local.get $pattern) (i32.const 4))
            (return (call $doTessellateTetrahedron 
                (local.get $contourValue) 
                (local.get $point2) 
                (local.get $point3)
                (local.get $point0) 
                (local.get $point1) 
                (call $bits (local.get $pattern) (i32.const 2) (i32.const 3) (i32.const 0) (i32.const 1))
                (local.get $inverse)
            ))
        )
        (if (i32.and (local.get $pattern) (i32.const 8))
            (return (call $doTessellateTetrahedron 
                (local.get $contourValue) 
                (local.get $point3)
                (local.get $point2) 
                (local.get $point1) 
                (local.get $point0) 
                (call $bits (local.get $pattern) (i32.const 3) (i32.const 2) (i32.const 1) (i32.const 0))
                (local.get $inverse)
            ))
        )

        (return (call $noTriangles))
    )

    (func $doTessellateTetrahedron 
        (param $contourValue f64) 
        (param $point0 i32) 
        (param $point1 i32) 
        (param $point2 i32) 
        (param $point3 i32) 
        (param $pattern i32)
        (param $inverse i32)
        (result i32)

        (if (i32.eq (local.get $pattern) (i32.const 3))
            (return (call $twoTriangles 
                (local.get $contourValue) 
                (local.get $point0) 
                (local.get $point1) 
                (local.get $point2) 
                (local.get $point3) 
                (local.get $inverse)
            ))
        )
        (if (i32.eq (local.get $pattern) (i32.const 5))
            (return (call $twoTriangles 
                (local.get $contourValue) 
                (local.get $point0) 
                (local.get $point2) 
                (local.get $point3) 
                (local.get $point1) 
                (local.get $inverse)
            ))
        )
        (if (i32.eq (local.get $pattern) (i32.const 9))
            (return (call $twoTriangles 
                (local.get $contourValue) 
                (local.get $point0) 
                (local.get $point3) 
                (local.get $point1) 
                (local.get $point2) 
                (local.get $inverse)
            ))
        )
        (return (call $oneTriangle 
            (local.get $contourValue) 
            (local.get $point0) 
            (local.get $point1) 
            (local.get $point2) 
            (local.get $point3) 
            (local.get $inverse)
        ))
    )

    (func $noTriangles (result i32)
        (call $allocate32 (i32.const 0))
    )

    (func $oneTriangle 
        (param $contourValue f64) 
        (param $point0 i32) 
        (param $point1 i32) 
        (param $point2 i32) 
        (param $point3 i32) 
        (param $inverse i32)
        (result i32)
        (if (result i32) (local.get $inverse)
            (then
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point1)) 
                (drop (call $edge (local.get $contourValue) (local.get $point0) (local.get $point2)))
                (drop (call $edge (local.get $contourValue) (local.get $point0) (local.get $point3))) 
            )
            (else
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point3)) 
                (drop (call $edge (local.get $contourValue) (local.get $point0) (local.get $point2)))
                (drop (call $edge (local.get $contourValue) (local.get $point0) (local.get $point1))) 
            )
        )
    )

    (func $twoTriangles 
        (param $contourValue f64) 
        (param $point0 i32) 
        (param $point1 i32) 
        (param $point2 i32) 
        (param $point3 i32) 
        (param $inverse i32)
        (result i32)
        (if (result i32) (local.get $inverse)
            (then
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point2)) 
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point3))
                (call $edge (local.get $contourValue) (local.get $point1) (local.get $point2))
                (drop (call $edgeClone))
                (drop (call $edgeClone))
                (drop (call $edge (local.get $contourValue) (local.get $point1) (local.get $point3)))
            )
            (else
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point2)) 
                (call $edge (local.get $contourValue) (local.get $point1) (local.get $point2))
                (call $edge (local.get $contourValue) (local.get $point0) (local.get $point3))
                (drop (call $edgeClone))
                (drop (call $edgeClone))
                (drop (call $edge (local.get $contourValue) (local.get $point1) (local.get $point3)))
            )
        )
    )

    (func $edge (param $contourValue f64) (param $point1 i32) (param $point2 i32) (result i32)
        (local $point i32)
        (local $normal i32)
        (local $gradient1 i32)
        (local $gradient2 i32)
        (local $weight1 f64)
        (local $weight2 f64)
        (local $sum f64)
        
        (local.set $gradient1 (i32.add (local.get $point1) (i32.const 32)))
        (local.set $gradient2 (i32.add (local.get $point2) (i32.const 32)))
        (local.set $weight1 (f64.sub (local.get $contourValue) (call $pointValue (local.get $point2))))
        (local.set $weight2 (f64.sub (call $pointValue (local.get $point1)) (local.get $contourValue)))
        (local.set $sum (f64.add (local.get $weight1) (local.get $weight2)))
        (local.set $weight1 (f64.div (local.get $weight1) (local.get $sum)))
        (local.set $weight2 (f64.div (local.get $weight2) (local.get $sum)))

        (local.tee $point (call $allocate32 (i32.const 3)))
        (local.set $normal (call $allocate32 (i32.const 3)))
        (call $enter)
        (drop (call $f64_vec3_demote_copy 
            (call $vec3Add 
                (call $vec3Scale (local.get $point1) (local.get $weight1))
                (call $vec3Scale (local.get $point2) (local.get $weight2))
            ) 
            (local.get $point)
        ))
        (drop (call $f64_vec3_demote_copy 
            (call $vec3Scale (call $vec3Add 
                (call $vec3Scale (local.get $gradient1) (local.get $weight1))
                (call $vec3Scale (local.get $gradient2) (local.get $weight2))
            ) (f64.const -1))
            (local.get $normal)
        ))
        (call $leave)
    )

    (func $edgeClone (param $edge i32) (result i32)
        (call $f32_vec3_clone (local.get $edge))
        (drop (call $f32_vec3_clone (i32.add (local.get $edge) (i32.const 12))))
    )

    (func $calculatePattern 
        (param $contourValue f64) 
        (param $point0 i32) 
        (param $point1 i32) 
        (param $point2 i32) 
        (param $point3 i32) 
        (result i32)
        (i32.const 0)
        (i32.or (call $isHotPoint (local.get $point0) (local.get $contourValue) (i32.const 1)))
        (i32.or (call $isHotPoint (local.get $point1) (local.get $contourValue) (i32.const 2)))
        (i32.or (call $isHotPoint (local.get $point2) (local.get $contourValue) (i32.const 4)))
        (i32.or (call $isHotPoint (local.get $point3) (local.get $contourValue) (i32.const 8)))
    )
    
    (func $isHotPoint (param $point i32) (param $contourValue f64) (param $trueValue i32) (result i32)
        (if (result i32) (f64.ge (call $pointValue (local.get $point)) (local.get $contourValue))
            (then (local.get $trueValue))
            (else (i32.const 0))
        )
    )

    (func $pointValue (param $point i32) (result f64)
        (f64.load (i32.add (local.get $point) (i32.const 56)))
    )

    (func $bits (param $pattern i32) (param $bit0 i32) (param $bit1 i32) (param $bit2 i32) (param $bit3 i32) (result i32)
        (i32.and (i32.shr_u (local.get $pattern) (local.get $bit3))(i32.const 1))
        
        (i32.shl (i32.const 1))
        (i32.and (i32.shr_u (local.get $pattern) (local.get $bit2))(i32.const 1))
        (i32.or)
        
        (i32.shl (i32.const 1))
        (i32.and (i32.shr_u (local.get $pattern) (local.get $bit1))(i32.const 1))
        (i32.or)
        
        (i32.shl (i32.const 1))
        (i32.and (i32.shr_u (local.get $pattern) (local.get $bit0))(i32.const 1))
        (i32.or)
    )

    (export "tessellateTetrahedron" (func $tessellateTetrahedron))
    (export "tessellateCube" (func $tessellateCube))
    (export "tesselateScalarField" (func $tesselateScalarField))

)