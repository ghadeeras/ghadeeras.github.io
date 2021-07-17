(module

    (memory $stack 1)

    (global $stackTop (mut i32) (i32.const 0))
    (global $localOffset (mut i32) (i32.const 0))
    (global $stackLimit (mut i32) (i32.const 0xFFFF))

    (func $grow (param $size i32)
        (local $neededGrowth i32)
        (local.set $neededGrowth (i32.sub 
            (i32.add 
                (global.get $stackTop) 
                (local.get $size)
            ) 
            (global.get $stackLimit)
        ))
        (if (i32.gt_s (local.get $neededGrowth) (i32.const 0))
            (then
                (local.set $neededGrowth (i32.div_s 
                    (i32.add 
                        (local.get $neededGrowth) 
                        (i32.const 0xFFFF)
                    ) 
                    (i32.const 0x10000)
                ))
                (drop (memory.grow (local.get $neededGrowth)))
                (global.set $stackLimit (i32.add 
                    (global.get $stackLimit) 
                    (i32.mul 
                        (local.get $neededGrowth) 
                        (i32.const 0x10000)
                    )
                ))
            )
        )
    )

    (func $align2
        (local $mod i32)
        (local.set $mod (i32.and 
            (global.get $stackTop) 
            (i32.const 1) 
        ))
        (if (i32.ne (local.get $mod) (i32.const 0))
            (then (drop (call $allocate8 (i32.sub 
                (i32.const 2) 
                (local.get $mod)
            ))))
        )
    )

    (func $align4
        (local $mod i32)
        (local.set $mod (i32.and 
            (global.get $stackTop) 
            (i32.const 3) 
        ))
        (if (i32.ne (local.get $mod) (i32.const 0))
            (then (drop (call $allocate8 (i32.sub 
                (i32.const 4) 
                (local.get $mod)
            ))))
        )
    )

    (func $align8
        (local $mod i32)
        (local.set $mod (i32.and 
            (global.get $stackTop) 
            (i32.const 7) 
        ))
        (if (i32.ne (local.get $mod) (i32.const 0))
            (then (drop (call $allocate8 (i32.sub 
                (i32.const 8) 
                (local.get $mod)
            ))))
        )
    )

    (func $enter
        (call $grow (i32.const 4))
        (i32.store (global.get $stackTop) (global.get $localOffset))
        (global.set $localOffset (global.get $stackTop))
        (global.set $stackTop (i32.add (global.get $stackTop) (i32.const 4)))
    )

    (func $leave
        (global.set $stackTop (global.get $localOffset))
        (if (i32.ne (global.get $localOffset) (i32.const 0))
            (then (global.set $localOffset (i32.load (global.get $stackTop))))
        )
    )

    (func $return_i32 (param $result i32) (result i32)
        (call $leave)
        (local.get $result)
    )

    (func $return_i64 (param $result i64) (result i64)
        (call $leave)
        (local.get $result)
    )

    (func $return_f32 (param $result f32) (result f32)
        (call $leave)
        (local.get $result)
    )

    (func $return_f64 (param $result f64) (result f64)
        (call $leave)
        (local.get $result)
    )

    (func $allocate8 (param $size i32) (result i32)
        (local $ref i32)
        (call $grow (local.get $size))
        (local.set $ref (global.get $stackTop))
        (global.set $stackTop (i32.add (local.get $ref) (local.get $size)))
        (local.get $ref)
    )

    (func $allocate16 (param $size i32) (result i32)
        (call $align2)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 1)))
    )

    (func $allocate32 (param $size i32) (result i32)
        (call $align4)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 2)))
    )

    (func $allocate64 (param $size i32) (result i32)
        (call $align8)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 3)))
    )

    (export "stack" (memory $stack))

    (export "enter" (func $enter))
    (export "leave" (func $leave))
    (export "return_i32" (func $return_i32))
    (export "return_i64" (func $return_i64))
    (export "return_f32" (func $return_f32))
    (export "return_f64" (func $return_f64))
    (export "allocate8" (func $allocate8))
    (export "allocate16" (func $allocate16))
    (export "allocate32" (func $allocate32))
    (export "allocate64" (func $allocate64))

)