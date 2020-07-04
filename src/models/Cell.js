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
    constructor(hex, state) {
        this.hex = hex;
        this.state = state;
        this.player = Math.round(Math.random() * (colors.length - 1));
        this.kingdom = undefined;
    }

    color() {
        return colors[this.player][0];
    }

    getKingdom() {
        if (this.kingdom === undefined) return Kingdom.for(this.hex);
        return this.kingdom;
    }

    click() {
        // If has a kingdom, select it
        const kingdom = this.getKingdom();
        if (kingdom) {
            if (this.state.selectedKingdom)
                this.state.selectedKingdom.destroy();

            this.state.selectedKingdom = kingdom;
            if (kingdom) kingdom.render(this);

            return;
        }

        // If no kingdom, add it to the current
        // TODO: only allow this on direct neighbours of the current kingdom
        if (this.state.selectedKingdom) {
            this.player = this.state.selectedKingdom.player;
            this.state.selectedKingdom.add(this.hex);
            console.log(this.state.selectedKingdom);
        }
    }

    corners() {
        const point = this.hex.toPoint();
        return this.hex.corners().map(corner => corner.add(point));
    }

    center() {
        const point = this.hex.toPoint();
        return this.hex.center().add(point);
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
