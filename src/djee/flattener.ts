module Djee {
    
    export type Getter<S, P> = (structure: S) => P; 
    export type Setter<S, P> = (structure: S, primitive: P) => void;

    type FlatteningOp<S, P> = (structure: S, array: P[], index: number) => void; 
    type CopyingOp<P> = (array1: P[], array2: P[], index: number) => void;

    function sum(v1: number, v2: number) {
        return v1 + v2;
    }
    
    export interface Flattener<S, P> {
        
        size: number;
        
        offsetOf<C>(child: Flattener<C, P>): number;

        flatten(structure: S, array?: P[], index?: number): P[];

        flattenAll(structures: S[], array?: P[], index?: number): P[];

        unflatten(structure: S, array: P[], index?: number);
        
    }
    
    abstract class AbstractFlattener<S, P> implements Flattener<S, P> {
        
        constructor(readonly size: number) {
        }
        
        protected abstract subFlatteners(): Flattener<any, P>[];

        protected abstract doFlatten(structure: S, array: P[], index: number);

        protected abstract doUnflatten(structure: S, array: P[], index: number);
        
        offsetOf(child: Flattener<any, P>): number {
            if (this == child) {
                return 0;
            } else {
                let offset = 0;
                const subFlatteners = this.subFlatteners(); 
                for (let i = 0; i < subFlatteners.length; i++) {
                    const subFlattener = subFlatteners[i];
                    const subOffset = subFlattener.offsetOf(child);
                    if (subOffset >= 0) {
                        return offset + subOffset; 
                    } else {
                        offset += subFlattener.size
                    }
                }
                return -1;
            }
        }

        flatten(structure: S, array: P[] = new Array(this.size), index: number = 0): P[] {
            this.doFlatten(structure, array, index);
            return array;
        }

        flattenAll(structures: S[], array: P[] = new Array(this.size * structures.length), index: number = 0): P[] {
            for (let i = 0; i < structures.length; i++) {
                this.flatten(structures[i], array, index);
                index += this.size;
            }
            return array;
        }
        
        unflatten(structure: S, array: P[], index: number = 0) {
            this.doUnflatten(structure, array, index);
        }
        
    }
    
    class PrimitiveFlattener<S, P> extends AbstractFlattener<S, P> {
        
        constructor(private readonly getter: Getter<S, P>, private readonly setter: Setter<S, P>) {
            super(1);
        }
        
        protected subFlatteners(): Flattener<any, P>[] {
            return [];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            array[index] = this.getter(structure);
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.setter(structure, array[index]);
        }

    }
    
    class ArrayFlattener<S, P> extends AbstractFlattener<S, P> {
        
        constructor(size: number, private readonly getter: Getter<S, P[]>) {
            super(size);
            this.getter = getter;
        }
        
        protected subFlatteners(): Flattener<any, P>[] {
            return [];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, (sa, a, i) => a[index + i] = sa[i]);
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, (sa, a, i) => sa[i] = a[index + i]);
        }

        private copy(structure: S, array: P[], copier: CopyingOp<P>) {
            const structureArray = this.getter(structure);
            for (let i = 0; i < this.size; i++) {
                copier(structureArray, array, i);
            }
        }

    }
    
    class ChildFlattener<S, C, P> extends AbstractFlattener<S, P> {
        
        constructor(private readonly flattener: Flattener<C, P>, private readonly getter: Getter<S, C>) {
            super(flattener.size);
        }
        
        protected subFlatteners(): Flattener<any, P>[] {
            return [this.flattener];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (s, a, i) => this.flattener.flatten(s, a, i));
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (s, a, i) => this.flattener.unflatten(s, a, i));
        }

        private copy(structure: S, array: P[], index: number, copier: FlatteningOp<C, P>) {
            copier(this.getter(structure), array, index);
        }

    }
    
    class CompositeFlattener<S, P> extends AbstractFlattener<S, P> {
        
        constructor(private readonly flatteners: Flattener<S, P>[]) {
            super(flatteners.map(f => f.size).reduce(sum)); 
        }
        
        protected subFlatteners(): Flattener<any, P>[] {
            return this.flatteners;
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, f => (s, a, i) => f.flatten(s, a, i));
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, f => (s, a, i) => f.unflatten(s, a, i));
        }

        private copy(structure: S, array: P[], index: number, copier: Getter<Flattener<S, P>, FlatteningOp<S, P>>) {
            for (let i = 0; i < this.flatteners.length; i++) {
                const f = this.flatteners[i];
                copier(f)(structure, array, index);
                index += f.size;
            }
        }

    }

    export const flatteners = {

        composite: function<S, C, P>(...flatteners: Flattener<S, P>[]): Flattener<S, P> {
            return new CompositeFlattener(flatteners);
        },
        
        primitive: function<S, P>(getter: Getter<S, P>, setter: Setter<S, P>): Flattener<S, P> {
            return new PrimitiveFlattener(getter, setter);
        },
        
        array: function<S, P>(getter: Getter<S, P[]>, size: number): Flattener<S, P> {
            return new ArrayFlattener(size, getter);
        },
        
        child: function<S, C, P>(getter: Getter<S, C>, flattener: Flattener<C, P>): Flattener<S, P> {
            return new ChildFlattener(flattener, getter);
        }
        
    }
    
}