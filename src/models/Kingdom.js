import { Vector, Polygon, Geometry,  useNewComponent, useChild, useDestroy, useDraw } from "@hex-engine/2d";
import { polygon } from '@turf/helpers';
import union from '@turf/union';
import PolygonJs from 'polygon';

const hexBounds = hexes => {
    // TODO: this breaks if the hexes form a "circle" with a hole inside

    // Be quick for a single hex
    if (hexes.length === 1) return hexes[0].data.corners();

    // Get the corner vertexes for all the hexes
    const vertexes = hexes
        .map(hex => hex.data.corners().map(corner => [corner.x, corner.y]));

    // Create turf polygons for all the hexes
    const polys = vertexes.map(corners => polygon([[...corners, corners[0]]]));

    // Combine all the polygons together
    const poly = polys.reduce((prev, current) => {
        if (prev) return union(prev, current);
        return current;
    }, null);

    // They somehow end up upside-down, so rotate them 180
    const rotated = new PolygonJs(poly.geometry.coordinates[0]);
    rotated.rotate(Math.PI);

    // Return a set of vertexes
    return rotated.toArray().map(vertex => new Vector(...vertex)).slice(0, -1);
};

const center = vertexes => {
    const minX = vertexes.reduce((prev, current) => Math.min(prev, current.x), Infinity);
    const maxX = vertexes.reduce((prev, current) => Math.max(prev, current.x), -Infinity);
    const minY = vertexes.reduce((prev, current) => Math.min(prev, current.y), Infinity);
    const maxY = vertexes.reduce((prev, current) => Math.max(prev, current.y), -Infinity);

    const deltaX = maxX - minX;
    const deltaY = maxY - minY;

    return new Vector((deltaX / 2) + minX, (deltaY / 2) + minY);
};

export default class Kingdom {
    constructor(hexes, state) {
        this.hexes = hexes;
        this.state = state;
        this.player = hexes[0].data.player;
        this.bounds = hexBounds(this.hexes);
        this.destroyCb = null;
    }

    static for (hex) {
        console.log('new kingdom for', hex);

        const toExplore = [hex];
        const kingdomHexes = [hex];
        const explored = [];

        // Find all neighbouring cells that are of the same player
        while (toExplore.length) {
            const hex = toExplore.pop();
            explored.push(hex);

            const direct = hex.data.state.grid.neighborsOf(hex)
                .filter(h => h !== undefined)
                .filter(h => h.data.player === hex.data.player);

            kingdomHexes.push(...direct.filter(h => !kingdomHexes.includes(h)));
            toExplore.push(...direct.filter(h => !toExplore.includes(h) && !explored.includes(h)))
        }

        // Can't have a kingdom of 1
        if (kingdomHexes.length === 1) {
            hex.data.kingdom = null;
            return null;
        }

        // Return the kingdom
        const kingdom = new Kingdom(kingdomHexes, hex.data.state);
        kingdomHexes.forEach(h => h.data.kingdom = kingdom);
        return kingdom;
    }

    destroy() {
        if (this.destroyCb) this.destroyCb();
    }

    add(hex) {
        if (hex.data.kingdom) hex.data.kingdom.remove(hex);

        this.hexes.push(hex);
        this.bounds = hexBounds(this.hexes);
        hex.data.kingdom = this;

        // TODO: check if we need to merge any kingdoms

        if (this.state.selectedKingdom === this) {
            this.destroy()
            this.render(hex.data);
        }
    }

    remove(hex) {
        this.hexes = this.hexes.filter(c => c !== hex);
        this.bounds = hexBounds(this.hexes);
        hex.data.kingdom = null;
    }

    render(parentCell) {
        console.log('bounds', this.bounds);

        // Create the bounds poly
        const pos = new Vector(0, 0);
        const poly = new Polygon(this.bounds);

        // Adjust the position for any shift in the centroid through processing
        const vertexes = this.hexes
            .map(hex => hex.data.corners()).flat();
        const kingdomCenter = center(vertexes);
        const boundsCenter = center(this.bounds);
        const boundsShift = kingdomCenter.subtract(boundsCenter);
        pos.addMutate(boundsShift);

        // Adjust the position for the poly not being centered
        const polyShift = new Vector(0, 0).subtract(center(poly.points));
        pos.addMutate(polyShift);
        console.log('poly center shift', polyShift);

        // Adjust for difference between kingdom center and parent center
        const centerShift = kingdomCenter.subtract(parentCell.center());
        pos.addMutate(centerShift);

        // Render out the new poly
        useChild(() => {
            const { destroy } = useDestroy();
            this.destroyCb = destroy;

            const geometry = useNewComponent(() =>
                Geometry({
                    shape: poly,
                    position: pos,
                })
            );

            useDraw(context => {
                context.strokeStyle = "white";
                context.lineWidth = 3;
                geometry.shape.draw(context, "stroke");
            });
        });
    }
};
