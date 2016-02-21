/// <reference path="call.ts" />
/// <reference path="pluggable.ts" />
/// <reference path="actuator.ts" />
/// <reference path="sensor.ts" />
/// <reference path="controllable.ts" />
/// <reference path="measurable.ts" />
/// <reference path="value.ts" />

module Gear {
    
    export type Callable = () => void;
    export type Consumer<T> = (input: T) => void;
    
}