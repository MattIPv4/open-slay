import { Vector, Polygon, Geometry,  useNewComponent, useChild, useDestroy, useDraw } from "@hex-engine/2d";
import { polygon } from '@turf/helpers';
import union from '@turf/union';
import PolygonJs from 'polygon';

const hexBounds = hexes => {
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
    constructor(cells, state) {
        this.cells = cells;
        this.state = state;
        this.player = cells[0].player;
        this.bounds = hexBounds(this.cells);
        this.destroyCb = null;
    }

    static for (cell) {
        console.log('new kingdom for', cell);

        const toExplore = [cell];
        const kingdomCells = [cell];
        const explored = [];

        // Find all neighbouring cells that are of the same player
        while (toExplore.length) {
            const cell = toExplore.pop();
            explored.push(cell);

            const direct = cell.data.state.grid.neighborsOf(cell)
                .filter(hex => hex !== undefined)
                .filter(hex => hex.data.player === cell.data.player);

            kingdomCells.push(...direct.filter(hex => !kingdomCells.includes(hex)));
            toExplore.push(...direct.filter(hex => !toExplore.includes(hex) && !explored.includes(hex)))
        }

        // Can't have a kingdom of 1
        if (kingdomCells.length === 1) {
            cell.data.kingdom = null;
            return null;
        }

        // Return the kingdom
        const kingdom = new Kingdom(kingdomCells, cell.data.state);
        kingdomCells.forEach(hex => hex.data.kingdom = kingdom);
        return kingdom;
    }

    destroy() {
        if (this.destroyCb) this.destroyCb();
    }

    render(parentCell) {
        console.log('bounds', this.bounds);

        // Create the bounds poly
        const pos = new Vector(0, 0);
        const poly = new Polygon(this.bounds);

        // Adjust the position for any shift in the centroid through processing
        const vertexes = this.cells
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
