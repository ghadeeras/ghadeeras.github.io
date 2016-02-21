module Gear {
    
    export class Sensor<V> extends ExclusivelyPluggable<Sensor<V>, Measurable<V>> {
        
        private _consumer: Consumer<V>;
        private _sensing: Call;
        
        constructor(consumer: Consumer<V>) {
            super();
            this._consumer = consumer;
            this._sensing = new Call(() => this.sense(this.measurable.sample))
        }
        
        protected self() {
            return this;
        }
        
        get measurable() {
            return this.pluggedComponent;
        }
        
        probes(measurable: IsMeasurable<V>) {
            this.plug(measurable.asMeasurable);
            this._sensing.later();
        }
        
        probesNone() {
            this.unplugAll();
        }
        
        sense(value: V) {
            this._consumer(value);
        }
        
        get reading() {
            return this.measurable.sample;
        }
        
    }
    
}