module Gear {
    
    export interface IsMeasurable<V> {
        
        asMeasurable: Measurable<V>
        
    }
    
    export class Measurable<V> extends Pluggable<Measurable<V>, Sensor<V>> implements IsMeasurable<V> {
        
        private _value: V;
        
        constructor(value: V) {
            super();
            this._value = value;
        }
        
        protected self() {
            return this;
        }
        
        get asMeasurable() {
            return this;
        }
        
        get sensors() {
            return this.pluggedComponents
        }
        
        conduct(value: V) {
            this._value = value;
            this.sensors.forEach(s => s.sense(value));
        }
        
        get sample() {
            return this._value;
        }
        
    }
    
}