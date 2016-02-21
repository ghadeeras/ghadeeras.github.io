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

        unflatten(structure: S, array: P[], index?: number);
        
    }
    
    export abstract class AbstractFlattener<S, P> implements Flattener<S, P> {
        
        private _size: number;
        
        constructor(size: number) {
            this._size = size;
        }
        
        protected abstract subFlatteners(): Flattener<any, P>[];

        protected abstract doFlatten(structure: S, array: P[], index: number);

        protected abstract doUnflatten(structure: S, array: P[], index: number);
        
        get size(): number {
            return this._size;
        }

        offsetOf(child: Flattener<any, P>): number {
            if (this == child) {
                return 0;
            } else {
                var offset = 0;
                var subFlatteners = this.subFlatteners(); 
                for (var i = 0; i < subFlatteners.length; i++) {
                    var subFlattener = subFlatteners[i];
                    var subOffset = subFlattener.offsetOf(child);
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

        unflatten(structure: S, array: P[], index: number = 0) {
            this.doUnflatten(structure, array, index);
        }
        
    }
    
    export class PrimitiveFlattener<S, P> extends AbstractFlattener<S, P> {
        
        private _getter: Getter<S, P>;
        private _setter: Setter<S, P>;
        
        constructor(getter: Getter<S, P>, setter: Setter<S, P>) {
            super(1);
            this._getter = getter;
            this._setter = setter;
        }
        
        protected subFlatteners(): Flattener<any, P>[] {
            return [];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            array[index] = this._getter(structure);
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this._setter(structure, array[index]);
        }

    }
    
    export class ArrayFlattener<S, P> extends AbstractFlattener<S, P> {
        
        private _getter: Getter<S, P[]>;
        
        constructor(size: number, getter: Getter<S, P[]>) {
            super(size);
            this._getter = getter;
        }
        
        private copy(structure: S, array: P[], index: number, copier: CopyingOp<P>) {
            var structureArray = this._getter(structure);
            for (var i = 0; i < this.size; i++) {
                copier(structureArray, array, i);
            }
        }

        protected subFlatteners(): Flattener<any, P>[] {
            return [];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (sa, a, i) => a[index + i] = sa[i]);
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (sa, a, i) => sa[i] = a[index + i]);
        }

    }
    
    export class ChildFlattener<S, C, P> extends AbstractFlattener<S, P> {
        
        private _flattener: Flattener<C, P>;
        private _getter: Getter<S, C>;
        
        constructor(flattener: Flattener<C, P>, getter: Getter<S, C>) {
            super(flattener.size);
            this._flattener = flattener;
            this._getter = getter;
        }
        
        private copy(structure: S, array: P[], index: number, copier: FlatteningOp<C, P>) {
            copier(this._getter(structure), array, index);
        }

        protected subFlatteners(): Flattener<any, P>[] {
            return [this._flattener];
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (s, a, i) => this._flattener.flatten(s, a, i));
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, (s, a, i) => this._flattener.unflatten(s, a, i));
        }

    }
    
    export class CompositeFlattener<S, P> extends AbstractFlattener<S, P> {
        
        private _flatteners: Flattener<S, P>[];
        
        constructor(flatteners: Flattener<S, P>[]) {
            super(flatteners.map(f => f.size).reduce(sum)); 
            this._flatteners = flatteners;
        }
        
        private copy(structure: S, array: P[], index: number, copier: Getter<Flattener<S, P>, FlatteningOp<S, P>>) {
            for (var i = 0; i < this._flatteners.length; i++) {
                var f = this._flatteners[i];
                copier(f)(structure, array, index);
                index += f.size;
            }
        }

        protected subFlatteners(): Flattener<any, P>[] {
            return this._flatteners;
        }

        protected doFlatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, f => (s, a, i) => f.flatten(s, a, i));
        }

        protected doUnflatten(structure: S, array: P[], index: number) {
            this.copy(structure, array, index, f => (s, a, i) => f.unflatten(s, a, i));
        }

    }
    
    export abstract class FlattenerBuilder<S, P> {
        
        private _flatteners: Flattener<S, P>[] = [];
        
        private add(flattener: Flattener<S, P>) {
            this._flatteners.push(flattener);
            return flattener;
        }
        
        protected primitive(getter: Getter<S, P>, setter: Setter<S, P>) {
            return this.add(new PrimitiveFlattener(getter, setter));
        }
        
        protected array(getter: Getter<S, P[]>, size: number) {
            return this.add(new ArrayFlattener(size, getter));
        }
        
        protected child<C>(getter: Getter<S, C>, flattener: FlattenerBuilder<C, P>) {
            return this.add(new ChildFlattener(flattener.build(), getter));
        }
        
        build(): Flattener<S, P> {
            return new CompositeFlattener(this._flatteners);
        }
        
    }
    
    export function flatten<S, P>(
        flattener: Flattener<S, P>,
        structures: S[], 
        array: P[] = new Array(flattener.size * structures.length), 
        index: number = 0
    ): P[] {
        for (var i = 0; i < structures.length; i++) {
            flattener.flatten(structures[i], array, index);
            index += flattener.size;
        }
        return array;
    }
    
}