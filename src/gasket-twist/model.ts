module GasketTwist {
    
    function vectorFlattener(size: number): Djee.Flattener<Space.Vector, number> {
        return new Djee.ArrayFlattener<Space.Vector, number>(size, v => v.coordinates);
    }
    
    export class Rendering {
        
        private _twist = new Gear.SimpleValue<number>(0);
        private _scale = new Gear.SimpleValue<number>(1);
        private _showCorners = new Gear.SimpleValue<boolean>(true);
        private _showCenters = new Gear.SimpleValue<boolean>(true);
        
        get twist() {
            return this._twist;
        }
        
        get scale() {
            return this._scale;
        }
        
        get showCorners() {
            return this._showCorners;
        }
        
        get showCenters() {
            return this._showCenters;
        }
        
    }
    
    type ArraySelector = (s: Sierpinski) => Space.Vector[];
    
    export interface FlattenedSierpinski {
        corners: number[];
        centers: number[];
        stride: number;
    }
    
    function vec(angleIndex: number) {
        var angle = Math.PI * (0.5 + 2 * angleIndex / 3)
        return Space.vec([Math.cos(angle), Math.sin(angle)]);
    }
        
    export class Sierpinski {

        private _a: Space.Vector;
        private _b: Space.Vector;
        private _c: Space.Vector;

        private _corners: Space.Vector[];
        private _centers: Space.Vector[];
        
        private _tesselation = new Gear.Call(() => this._outArrays.conduct(this.flattened));
        
        private _inA = new Gear.Controllable<Space.Vector>(a => {
            this._a = a;
            this._tesselation.later();
        });

        private _inB = new Gear.Controllable<Space.Vector>(b => {
            this._b = b;
            this._tesselation.later();
        });

        private _inC = new Gear.Controllable<Space.Vector>(c => {
            this._c = c;
            this._tesselation.later();
        });

        private _depth = new Gear.SimpleValue<number>(5, (inc, oldValue) => {
            var newValue = oldValue + inc;
            if (newValue > 9) {
                newValue = 9;
            } else if (newValue < 0) {
                newValue = 0;
            }
            this._tesselation.later();
            return newValue;
        });
        
        private _outArrays;

        get inA() {
            return this._inA;
        }
        
        get inB() {
            return this._inB;
        }

        get inC() {
            return this._inC;
        }

        get depth() {
            return this._depth;
        }
        
        get outArrays() {
            return this._outArrays;
        }
        
        constructor(
            a: Space.Vector = vec(0), 
            b: Space.Vector = vec(1), 
            c: Space.Vector = vec(2), 
            depth: number = 5
        ) {
            this._a = a;
            this._b = b;
            this._c = c;
            this._outArrays = new Gear.Measurable<FlattenedSierpinski>(this.flattened);
        }
        
        private tesselateTriangle() {
            var depth = this._depth.asMeasurable.sample;
            this._corners = [];
            this._centers = [];
            this.doTesselateTriangle(this._a, this._b, this._c, depth);
        }
        
        private static corners: ArraySelector = s => s._corners; 
        private static centers: ArraySelector = s => s._centers; 

        private doTesselateTriangle(
            a: Space.Vector, 
            b: Space.Vector, 
            c: Space.Vector, 
            counter: number, 
            selector: ArraySelector = Sierpinski.corners
        ) {
            if (counter == 0) {
                selector(this).push(a, b, c);
            } else {
                var ab = a.mix(b, 0.5);
                var bc = b.mix(c, 0.5);
                var ca = c.mix(a, 0.5);
                var newCounter = counter - 1;
                this.doTesselateTriangle(a, ab, ca, newCounter, selector);
                this.doTesselateTriangle(ab, b, bc, newCounter, selector);
                this.doTesselateTriangle(ca, bc, c, newCounter, selector);
                this.doTesselateTriangle(ab, bc, ca, newCounter, Sierpinski.centers);
            }
        }
        
        private get flattened(): FlattenedSierpinski {
            this.tesselateTriangle();
            var stride = this._a.coordinates.length;
            var flattener = vectorFlattener(stride);
            return {
                corners: Djee.flatten(flattener, this._corners),
                centers: Djee.flatten(flattener, this._centers),
                stride: stride
            };
        }
        
    }

}