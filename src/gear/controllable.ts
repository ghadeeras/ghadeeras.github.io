module Gear {
    
    export interface IsControllable<A> {
        
        asControllable: Controllable<A>
        
    }
    
    export class Controllable<A> extends ExclusivelyPluggable<Controllable<A>, Actuator<A>> implements IsControllable<A> {
        
        private _consumer: Consumer<A>;
        
        constructor(consumer: Consumer<A>) {
            super();
            this._consumer = consumer;
        }
        
        protected self() {
            return this;
        }
        
        get asControllable() {
            return this;
        }
        
        get actuator() {
            return this.pluggedComponent;
        }
        
        reactTo(action: A) {
            this._consumer(action);
        }
        
    }
    
}