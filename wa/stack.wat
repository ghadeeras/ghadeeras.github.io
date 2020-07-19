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

    (func $allocate8 (param $size i32) (result i32)
        (local $ref i32)
        (call $grow (local.get $size))
        (local.set $ref (global.get $stackTop))
        (global.set $stackTop (i32.add (local.get $ref) (local.get $size)))
        (local.get $ref)
    )

    (func $allocate16 (param $size i32) (result i32)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 1)))
    )

    (func $allocate32 (param $size i32) (result i32)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 2)))
    )

    (func $allocate64 (param $size i32) (result i32)
        (call $allocate8 (i32.shl (local.get $size) (i32.const 3)))
    )

    (export "stack" (memory $stack))

    (export "enter" (func $enter))
    (export "leave" (func $leave))
    (export "allocate8" (func $allocate8))
    (export "allocate16" (func $allocate16))
    (export "allocate32" (func $allocate32))
    (export "allocate64" (func $allocate64))

)