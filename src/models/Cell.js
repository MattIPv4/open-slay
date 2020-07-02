import { Vector, Polygon, Geometry, Mouse, useNewComponent, useChild, useDraw  } from "@hex-engine/2d";
import Kingdom from "./Kingdom";

const colors = [
    ['#ED5565', '#DA4453'],
    ['#FFCE54', '#F6BB42'],
    ['#A0D468', '#8CC152'],
    ['#4FC1E9', '#3BAFDA'],
    ['#5D9CEC', '#4A89DC'],
    ['#EC87C0', '#D770AD'],
];

export default class Cell {
    constructor(cell, state) {
        this.cell = cell;
        this.state = state;
        this.player = Math.round(Math.random() * (colors.length - 1));
        this.kingdom = undefined;
    }

    color() {
        return colors[this.player][0];
    }

    getKingdom() {
        if (this.kingdom === undefined) return Kingdom.for(this.cell);
        return this.kingdom;
    }

    click() {
        if (this.state.selectedKingdom)
            this.state.selectedKingdom.destroy();

        const kingdom = this.getKingdom();
        this.state.selectedKingdom = kingdom;
        if (kingdom) kingdom.render(this);
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
        useChild(() => {
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
        });
    }
};
