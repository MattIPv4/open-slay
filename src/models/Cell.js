import { Circle, Geometry, Mouse, Polygon, useChild, useDraw, useNewComponent, Vector } from "@hex-engine/2d";
import { polygon } from '@turf/helpers';
import union from '@turf/union';
import PolygonJs from 'polygon';

const colors = [
    ['#ED5565', '#DA4453'],
    ['#FFCE54', '#F6BB42'],
    ['#A0D468', '#8CC152'],
    ['#4FC1E9', '#3BAFDA'],
    ['#5D9CEC', '#4A89DC'],
    ['#EC87C0', '#D770AD'],
];

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
}

export default class Cell {
    constructor(cell, state) {
        this.cell = cell;
        this.state = state;
        this.player = Math.round(Math.random() * (colors.length - 1));
    }

    color() {
        return colors[this.player][0];
    }

    kingdom() {
        const toExplore = [this.cell];
        const kingdom = [this.cell];
        const explored = [];

        while (toExplore.length) {
            const cell = toExplore.pop();
            explored.push(cell);

            const direct = this.state.grid.neighborsOf(cell)
                .filter(hex => hex !== undefined)
                .filter(hex => hex.data.player === this.player);

            kingdom.push(...direct.filter(hex => !kingdom.includes(hex)));
            toExplore.push(...direct.filter(hex => !toExplore.includes(hex) && !explored.includes(hex)))
        }

        // Get the bounds for the kingdom
        const bounds = hexBounds(kingdom);
        console.log('bounds', bounds);

        // Create the bounds poly
        const pos = new Vector(0, 0);
        const poly = new Polygon(bounds);

        // Adjust the position for any shift in the centroid through processing
        const vertexes = kingdom
            .map(hex => hex.data.corners()).flat();
        const kingdomCenter = center(vertexes);
        const boundsCenter = center(bounds);
        const boundsShift = kingdomCenter.subtract(boundsCenter);
        pos.addMutate(boundsShift);

        // Adjust the position for the poly not being centered
        const polyShift = new Vector(0, 0).subtract(center(poly.points));
        pos.addMutate(polyShift);
        console.log('poly center shift', polyShift);

        // Adjust for difference between kingdom center and parent center
        const centerShift = kingdomCenter.subtract(this.center());
        pos.addMutate(centerShift);

        // Render out the new poly
        useChild(() => {
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

    click() {
        this.kingdom();
    }

    corners() {
        const point = this.cell.toPoint();
        return this.cell.corners().map(corner => corner.add(point));
    }

    center() {
        const point = this.cell.toPoint();
        return this.cell.center().add(point);
    }

    render() {
        const geometry = useNewComponent(() =>
            Geometry({
                shape: new Polygon(this.corners().map(corner => new Vector(corner.x, corner.y))),
                position: new Vector(...Object.values(this.center())),
            })
        );

        useDraw(context => {
            context.fillStyle = this.color();
            geometry.shape.draw(context, "fill");
        });

        const mouse = useNewComponent(Mouse);
        mouse.onClick(this.click.bind(this));
    }
};
