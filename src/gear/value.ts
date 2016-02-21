module Gear {
    
    export type Reactor<A, V> = (action: A, oldValue: V) => V; 
    
    export class Value<A, V> implements IsControllable<A>, IsMeasurable<V> {
        
        private _reactor: Reactor<A, V>;

        private _in: Controllable<A>;
        private _out: Measurable<V>;
        
        get asControllable() {
            return this._in;
        }
        
        get asMeasurable() {
            return this._out;
        }
        
        constructor(value: V, reactor: Reactor<A, V>) {
            this._reactor = reactor;
            this._in = new Controllable<A>(a => this.reactTo(a));
            this._out = new Measurable<V>(value);
        }
        
        private reactTo(action: A) {
            var newValue = this._reactor(action, this._out.sample);
            this._out.conduct(newValue);
        }
        
    }
    
    export class SimpleValue<V> extends Value<V, V> {
        
        constructor(value: V, reactor: Reactor<V, V> = (a, b) => a) {
            super(value, reactor);
        }
        
    }
    
}