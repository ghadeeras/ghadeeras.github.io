module Gear {
        
    export abstract class Pluggable<A, B> {
        
        private _pluggedComponents: Pluggable<B, A>[] = [];
        
        protected abstract self(): A;
        
        protected get itself() {
            return this.self();
        }
        
        protected get pluggedComponents() {
            return this._pluggedComponents.map(c => c.itself);
        }
        
        protected plug(component: Pluggable<B, A>) {
            this.doPlug(component);
            component.doPlug(this);
        }
        
        protected unplug(component: Pluggable<B, A>) {
            this.doUnplug(component);
            component.doUnplug(this);
        }
        
        protected unplugAll() {
            this._pluggedComponents.forEach(c => this.unplug(c));
        }

        private doPlug(component: Pluggable<B, A>) {
            this.prePlug();
            this._pluggedComponents.push(component);
        }
        
        private doUnplug(component: Pluggable<B, A>) {
            this._pluggedComponents.splice(this._pluggedComponents.indexOf(component), 1);
        }
        
        protected prePlug() {
        }

    }
    
    export abstract class ExclusivelyPluggable<A, B> extends Pluggable<A, B> {
        
        protected get pluggedComponent() {
            return this.pluggedComponents.length > 0 ? this.pluggedComponents[0] : null;
        }
        
        protected prePlug() {
            this.unplugAll();
        }

    }
    
}