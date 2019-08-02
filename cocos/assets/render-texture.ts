import { ccclass, property } from '../core/data/class-decorator';
import { GFXFormat } from '../gfx';
import { GFXDevice } from '../gfx/device';
import { GFXWindow } from '../gfx/window';
import { DepthStencilFormat, PixelFormat } from './asset-enum';
import { TextureBase } from './texture-base';
import { WebGL2GFXFramebuffer } from '../gfx/webgl2/webgl2-framebuffer';
import { ccenum } from '../core/value-types/enum';

export interface IRenderTextureCreateInfo {
    name: string;
    width: number;
    height: number;
    // colorFormat: PixelFormat;
    depthStencilFormat: DepthStencilFormat;
}

ccenum(DepthStencilFormat);

@ccclass('cc.RenderTexture')
export class RenderTexture extends TextureBase {
    public static DepthStencilFormat = DepthStencilFormat;
    private _window: GFXWindow | null = null;

    @property
    private _width: number = 0;

    @property
    private _height: number = 0;

    @property
    private _depthStencilFormat: DepthStencilFormat = DepthStencilFormat.NONE;

    @property
    get width () {
        return this._width;
    }

    set width (value) {
        this._width = value;
    }

    @property
    get height () {
        return this._height;
    }

    set height (value) {
        this._height = value;
    }

    @property
    get depthStencilFormat () {
        return this._depthStencilFormat;
    }

    set depthStencilFormat (value) {
        this._depthStencilFormat = value;
    }

    constructor () {
        super(true);
    }

    public getGFXWindow () {
        return this._window;
    }

    public getGFXTextureView () {
        return this._window ? this._window.colorTexView : null;
    }

    public getGFXStencilTexture (){
        return this._window ? this._window.depthStencilTexView : null;
    }

    public reset (info?: IRenderTextureCreateInfo) {
        if (info) {
            this._width = info.width;
            this._height = info.height;
            this._depthStencilFormat = info.depthStencilFormat;
            // this._format = info.colorFormat;
        }
        this._tryReset();
    }

    public destroy () {
        this._tryDestroyWindow();
        return super.destroy();
    }

    public readPixels (x?: number, y?: number, w?: number, h?: number, data?: Uint8Array) {
        if (!this._window || !this._window.colorTexView) {
            return data;
        }

        x = x || 0;
        y = y || 0;
        let width = w || this._width;
        let height = h || this._height;
        data = data || new Uint8Array(width * height * 4);

        let gl = cc.director.root.device.gl;
        let oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        gl.bindFramebuffer(gl.FRAMEBUFFER, (this._window.framebuffer as WebGL2GFXFramebuffer).gpuFramebuffer.glFramebuffer);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);

        return data;
    }

    public onLoaded (){
        this._tryReset();

        this.loaded = true;
        this.emit('load');
    }

    public _serialize(exporting?: any): any {
        return {
            base: super._serialize(),
            name: this._name,
            width: this._width,
            height: this._height,
            depthStencilFormat: this._depthStencilFormat,
            // colorFormat: this._format,
        };
    }

    public _deserialize (serializeData: any, handle: any) {
        super._deserialize(serializeData.base, handle);
        const data = serializeData as IRenderTextureCreateInfo;
        this.name = data.name;
        this._width = data.width;
        this._height = data.height;
        this._depthStencilFormat = data.depthStencilFormat;
    }

    private _tryReset () {
        this._tryDestroyWindow();
        const device = this._getGFXDevice();
        if (!device) {
            return;
        }
        this._window = this._createWindow(device);
    }

    private _createWindow (device: GFXDevice) {
        return cc.director.root!.createWindow({
            title: this.name,
            isOffscreen: true,
            width: this._width,
            height: this._height,
            colorFmt: this._getGFXFormat(),
            depthStencilFmt: this._depthStencilFormat as unknown as GFXFormat,
        });
    }

    private _tryDestroyWindow () {
        if (this._window) {
            cc.director.root.destroyWindow(this._window);
            this._window = null;
        }
    }
}

cc.RenderTexture = RenderTexture;