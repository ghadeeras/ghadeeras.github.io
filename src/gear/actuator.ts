module Gear {
    
    export class Actuator<A> extends ExclusivelyPluggable<Actuator<A>, Controllable<A>> {
        
        protected self() {
            return this;
        }
        
        get controllable() {
            return this.pluggedComponent;
        }
        
        drives(controllable: IsControllable<A>) {
            this.plug(controllable.asControllable);
        }
        
        drivesNone() {
            this.unplugAll();
        }
        
        perform(action: A) {
            this.controllable.reactTo(action);
        }
        
    }
    
}