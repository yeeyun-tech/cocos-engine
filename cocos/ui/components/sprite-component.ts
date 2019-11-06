/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category ui
 */

import { SpriteAtlas, SpriteFrame, AssetLibrary } from '../../core/assets';
import { ccclass, executionOrder, menu, property } from '../../core/data/class-decorator';
import { SystemEventType } from '../../core/platform/event-manager/event-enum';
import { Vec2 } from '../../core/math';
import { ccenum } from '../../core/value-types/enum';
import { clamp } from '../../core/math/utils';
import { UI } from '../../core/renderer/ui/ui';
import { UIRenderComponent, InstanceMaterialType } from '../../core/components/ui-base/ui-render-component';

/**
 * @zh
 * Sprite 类型。
 */
enum SpriteType {
    /**
     * @zh
     * 普通类型。
     */
    SIMPLE = 0,
    /**
     * @zh
     * 切片（九宫格）类型。
     */
    SLICED = 1,
    // /**
    //  * @zh  平铺类型
    //  * @property {Number} TILED
    //  */
    // TILED =  2,
    /**
     * @zh
     * 填充类型。
     */
    FILLED = 3,
    // /**
    //  * @en The mesh type.
    //  * @zh  以 Mesh 三角形组成的类型
    //  * @property {Number} MESH
    //  */
    // MESH: 4
}

ccenum(SpriteType);

/**
 * @zh
 * 填充类型。
 */
enum FillType {
    /**
     * @zh
     * 水平方向填充。
     */
    HORIZONTAL = 0,
    /**
     * @zh
     * 垂直方向填充。
     */
    VERTICAL = 1,
    // /**
    //  * @en The radial fill.
    //  * @zh  径向填充
    //  * @property {Number} RADIAL
    //  */
    RADIAL = 2,
}

ccenum(FillType);

/**
 * @zh
 * 精灵尺寸调整模式。
 */
enum SizeMode {
    /**
     * @zh
     * 使用节点预设的尺寸。
     */
    CUSTOM = 0,
    /**
     * @zh
     * 自动适配为精灵裁剪后的尺寸。
     */
    TRIMMED = 1,
    /**
     * @zh
     * 自动适配为精灵原图尺寸。
     */
    RAW = 2,
}

ccenum(SizeMode);

// var State = cc.Enum({
//     /**
//      * @en The normal state
//      * @zh  正常状态
//      * @property {Number} NORMAL
//      */
//     NORMAL: 0,
//     /**
//      * @en The gray state, all color will be modified to grayscale value.
//      * @zh  灰色状态，所有颜色会被转换成灰度值
//      * @property {Number} GRAY
//      */
//     GRAY: 1
// });

/**
 * @zh
 * 渲染精灵组件。
 * 可通过 cc.SpriteComponent 获得该组件。
 */
@ccclass('cc.SpriteComponent')
@executionOrder(110)
@menu('UI/Render/Sprite')
export class SpriteComponent extends UIRenderComponent {

    /**
     * @zh
     * 精灵的图集。
     */
    @property({
        type: SpriteAtlas,
        displayOrder: 4,
        tooltip:'图片资源所属的 Atlas 图集资源',
    })
    get spriteAtlas () {
        return this._atlas;
    }

    set spriteAtlas (value) {
        if (this._atlas === value) {
            return;
        }

        this._atlas = value;
//        this.spriteFrame = null;
    }

    /**
     * @zh
     * 精灵的精灵帧。
     */
    @property({
        type: SpriteFrame,
        displayOrder: 5,
        tooltip:'渲染 Sprite 使用的 SpriteFrame 图片资源',
    })
    get spriteFrame () {
        return this._spriteFrame;
    }

    set spriteFrame (value) {
        if (this._spriteFrame === value) {
            return;
        }

        const lastSprite = this._spriteFrame;
        this._spriteFrame = value;
        // render & update render data flag will be triggered while applying new sprite frame
        this.markForUpdateRenderData(false);
        this._applySpriteFrame(lastSprite);
        if (CC_EDITOR) {
            // @ts-ignore
            this.node.emit('spriteframe-changed', this);
        }
    }

    /**
     * @zh
     * 精灵渲染类型。
     *
     * @example
     * ```typescript
     * sprite.type = cc.SpriteComponent.Type.SIMPLE;
     * ```
     */
    @property({
        type: SpriteType,
        displayOrder: 6,
        tooltip:'渲染模式：\n- 普通（Simple）：修改尺寸会整体拉伸图像，适用于序列帧动画和普通图像 \n' +
        '- 九宫格（Sliced）：修改尺寸时四个角的区域不会拉伸，适用于 UI 按钮和面板背景 \n' +
        '- 填充（Filled）：设置一定的填充起始位置和方向，能够以一定比率剪裁显示图片',
    })
    get type () {
        return this._type;
    }
    set type (value: SpriteType) {
        if (this._type !== value) {
            this._type = value;
            this._flushAssembler();
        }
    }

    /**
     * @zh
     * 精灵填充类型，仅渲染类型设置为 cc.SpriteComponent.Type.FILLED 时有效。
     *
     * @example
     * ```typescript
     * sprite.fillType = cc.SpriteComponent.FillType.HORIZONTAL;
     * ```
     */
    @property({
        type: FillType,
        tooltip:'填充方向，可以选择横向（Horizontal），纵向（Vertical）和扇形（Radial）三种方向',
    })
    get fillType () {
        return this._fillType;
    }
    set fillType (value: FillType) {
        if (this._fillType !== value) {
            if (value === FillType.RADIAL || this._fillType === FillType.RADIAL) {
                this.destroyRenderData();
                this._renderData = null;
            } else {
                if (this._renderData) {
                    this.markForUpdateRenderData(true);
                }
            }
        }

        this._fillType = value;
        this._flushAssembler();
    }

    /**
     * @zh
     * 填充中心点，仅渲染类型设置为 cc.SpriteComponent.Type.FILLED 时有效。
     *
     * @example
     * ```typescript
     * sprite.fillCenter = cc.v2(0, 0);
     * ```
     */
    @property({
        tooltip:'扇形填充时，指定扇形的中心点，取值范围 0 ~ 1',
    })
    get fillCenter () {
        return this._fillCenter;
    }
    set fillCenter (value) {
        this._fillCenter.x = value.x;
        this._fillCenter.y = value.y;
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData();
        }
    }

    /**
     * @zh
     * 填充起始点，仅渲染类型设置为 cc.SpriteComponent.Type.FILLED 时有效。
     *
     * @example
     * ```typescript
     * // -1 To 1 between the numbers
     * sprite.fillStart = 0.5;
     * ```
     */
    @property({
        range: [0, 1, 0.1],
        tooltip:'填充起始位置，输入一个 0 ~ 1 之间的小数表示起始位置的百分比',
    })
    get fillStart () {
        return this._fillStart;
    }

    set fillStart (value) {
        this._fillStart = clamp(value, -1, 1);
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData();
            this._renderData.uvDirty = true;
        }
    }

    /**
     * @zh
     * 填充范围，仅渲染类型设置为 cc.SpriteComponent.Type.FILLED 时有效。
     *
     * @example
     * ```typescript
     * // -1 To 1 between the numbers
     * sprite.fillRange = 1;
     * ```
     */
    @property({
        range: [0, 1, 0.1],
        tooltip:'填充总量，取值范围 0 ~ 1 指定显示图像范围的百分比',
    })
    get fillRange () {
        return this._fillRange;
    }
    set fillRange (value) {
        // ??? -1 ~ 1
        this._fillRange = clamp(value, 0, 1);
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData();
            this._renderData.uvDirty = true;
        }
    }
    /**
     * @zh  是否使用裁剪模式。
     *
     * @example
     * ```typescript
     * sprite.trim = true;
     * ```
     */
    @property({
        displayOrder: 8,
        tooltip:'节点约束框内是否包括透明像素区域，勾选此项会去除节点约束框内的透明区域',
    })
    get trim () {
        return this._isTrimmedMode;
    }

    set trim (value) {
        if (this._isTrimmedMode === value) {
            return;
        }

        this._isTrimmedMode = value;
        if ((this._type === SpriteType.SIMPLE /*|| this._type === SpriteType.MESH*/) &&
            this._renderData) {
            this.markForUpdateRenderData(true);
        }
    }

    @property
    get grayscale () {
        return this._useGrayscale;
    }
    set grayscale (value) {
        if (this._useGrayscale === value) {
            return;
        }
        this._useGrayscale = value;
        if (value === true) {
            this._instanceMaterialType = InstanceMaterialType.GRAYSCALE; }
        else {
            this._instanceMaterialType = InstanceMaterialType.ADDCOLORANDTEXTURE;
        }
        this._instanceMaterial();
    }

    /**
     * @zh  精灵尺寸调整模式。
     *
     * @example
     * ```typescript
     * sprite.sizeMode = cc.SpriteComponent.SizeMode.CUSTOM;
     * ```
     */
    @property({
        type: SizeMode,
        displayOrder: 7,
        tooltip:'指定 Sprite 所在节点的尺寸，CUSTOM 表示自定义尺寸，TRIMMED 表示取原始图片剪裁透明像素后的尺寸，RAW 表示取原始图片未剪裁的尺寸',
    })
    get sizeMode () {
        return this._sizeMode;
    }
    set sizeMode (value) {
        if (this._sizeMode === value){
            return;
        }

        this._sizeMode = value;
        if (value !== SizeMode.CUSTOM) {
            this._applySpriteSize();
        }
    }

    public static FillType = FillType;
    public static Type = SpriteType;
    public static SizeMode = SizeMode;
    @property
    private _spriteFrame: SpriteFrame | null = null;
    @property
    private _type = SpriteType.SIMPLE;
    @property
    private _fillType = FillType.HORIZONTAL;
    @property
    private _sizeMode = SizeMode.TRIMMED;
    @property
    private _fillCenter: Vec2 = new Vec2(0, 0);
    @property
    private _fillStart = 0;
    @property
    private _fillRange = 0;
    @property
    private _isTrimmedMode = true;
    @property
    private _useGrayscale = false;
    // _state = 0;
    @property
    private _atlas: SpriteAtlas | null = null;
    // static State = State;

    public __preload () {
        if (super.__preload) {
            super.__preload();
        }

        if (CC_EDITOR) {
            this._resized();
            this.node.on(SystemEventType.SIZE_CHANGED, this._resized, this);
        }

        if(this._spriteFrame){
            this._spriteFrame.on('load', this._markForUpdateUvDirty, this);
            this._markForUpdateUvDirty();
        }
    }

    // /**
    //  * Change the state of sprite.
    //  * @method setState
    //  * @see `SpriteComponent.State`
    //  * @param state {SpriteComponent.State} NORMAL or GRAY State.
    //  */
    // getState() {
    //     return this._state;
    // }

    // setState(state) {
    //     if (this._state === state) return;
    //     this._state = state;
    //     this._activateMaterial();
    // }

    // onLoad() {}

    public onEnable() {
        super.onEnable();

        // this._flushAssembler();
        this._activateMaterial();
    }

    public onDestroy () {
        super.onDestroy();
        this.destroyRenderData();
        if (CC_EDITOR) {
            this.node.off(SystemEventType.SIZE_CHANGED, this._resized, this);
        }

        if (this._spriteFrame) {
            this._spriteFrame.off('load');
        }
    }

    protected _render(render: UI) {
        render.commitComp(this, this._spriteFrame!.getGFXTextureView(), this._assembler!);
    }

    protected _canRender () {
        // if (cc.game.renderType === cc.game.RENDER_TYPE_CANVAS) {
        //     if (!this._enabled) { return false; }
        // } else {
        //     if (!this._enabled || !this._material) { return false; }
        // }

        // const spriteFrame = this._spriteFrame;
        // if (!spriteFrame || !spriteFrame.textureLoaded()) {
        //     return false;
        // }
        // return true;
        if (!super._canRender()){
            return false;
        }

        const spriteFrame = this._spriteFrame;
        if (!spriteFrame || !spriteFrame.textureLoaded()) {
            return false;
        }

        return true;
    }

    protected _flushAssembler () {
        const assembler = SpriteComponent.Assembler!.getAssembler(this);

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this._material;
                this.markForUpdateRenderData();
                this._updateColor();
            }
        }
    }

    private _applySpriteSize () {
        if (this._spriteFrame) {
            if (SizeMode.RAW === this._sizeMode) {
                const size = this._spriteFrame.originalSize;
                this.node.setContentSize(size);
            } else if (SizeMode.TRIMMED === this._sizeMode) {
                const rect = this._spriteFrame.getRect();
                this.node.setContentSize(rect.width, rect.height);
            }

            this._activateMaterial();
        }
    }

    private _resized () {
        if (!CC_EDITOR) {
            return;
        }

        if (this._spriteFrame) {
            const actualSize = this.node.getContentSize();
            let expectedW = actualSize.width;
            let expectedH = actualSize.height;
            if (this._sizeMode === SizeMode.RAW) {
                const size = this._spriteFrame.getOriginalSize();
                expectedW = size.width;
                expectedH = size.height;
            } else if (this._sizeMode === SizeMode.TRIMMED) {
                const rect = this._spriteFrame.getRect();
                expectedW = rect.width;
                expectedH = rect.height;

            }

            if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
                this._sizeMode = SizeMode.CUSTOM;
            }
        }
    }

    private _activateMaterial () {
        const spriteFrame = this._spriteFrame;
        const material = this._material;
        // WebGL
        if (cc.game.renderType !== cc.game.RENDER_TYPE_CANVAS) {
            // if (!material) {
            //     this._material = cc.builtinResMgr.get('sprite-material');
            //     material = this._material;
            //     if (spriteFrame && spriteFrame.textureLoaded()) {
            //         material!.setProperty('mainTexture', spriteFrame);
            //         this.markForUpdateRenderData();
            //     }
            // }
            // TODO: use editor assets
            // else {
            if (spriteFrame) {
                if (material) {
                    // const matTexture = material.getProperty('mainTexture');
                    // if (matTexture !== spriteFrame) {
                    material.setProperty('mainTexture', spriteFrame);
                    this.markForUpdateRenderData();
                    // }
                }

            }
            // }

            if (this._renderData) {
                this._renderData.material = material;
            }
        } else {
            this.markForUpdateRenderData();
            // this.markForRender(true);
        }
    }
/*
    private _applyAtlas (spriteFrame: SpriteFrame | null) {
        if (!CC_EDITOR) {
            return;
        }
        // Set atlas
        if (spriteFrame) {
            if (spriteFrame.atlasUuid.length > 0) {
                if (!this._atlas || this._atlas._uuid !== spriteFrame.atlasUuid) {
                    const self = this;
                    AssetLibrary.loadAsset(spriteFrame.atlasUuid, (err, asset) => {
                        self._atlas = asset;
                    });
                }
            }else{
                this._atlas = null;
            }
        }
    }
*/
    private _onTextureLoaded () {
        if (!this.isValid) {
            return;
        }

        this._applySpriteSize();
    }

    private _applySpriteFrame (oldFrame: SpriteFrame | null) {
        // if (oldFrame && oldFrame.off) {
        //     oldFrame.off('load', this._onTextureLoaded, this);
        // }

        const spriteFrame = this._spriteFrame;
        // if (!spriteFrame || (this._material && this._material._texture) !== (spriteFrame && spriteFrame._texture)) {
        //     // disable render flow until texture is loaded
        //     this.markForRender(false);
        // }

        if (this._renderData) {
            if(oldFrame){
                oldFrame.off('load', this._markForUpdateUvDirty);
            }

            if(spriteFrame){
                spriteFrame.on('load', this._markForUpdateUvDirty, this);
            }

            if (!this._renderData.uvDirty) {
                if (oldFrame && spriteFrame) {
                    this._renderData.uvDirty = oldFrame.uvHash !== spriteFrame.uvHash;
                } else {
                    this._renderData!.uvDirty = true;
                }
            }

            this._renderDataFlag = this._renderData!.uvDirty
        }

        if (spriteFrame) {
            if (!oldFrame || spriteFrame !== oldFrame) {
                // this._material.setProperty('mainTexture', spriteFrame);
                if (spriteFrame.loaded) {
                    this._onTextureLoaded();
                } else {
                    spriteFrame.once('load', this._onTextureLoaded, this);
                }
            }
        }
/*
        if (CC_EDITOR&&this._atlas==null) {
            // Set atlas
            this._applyAtlas(spriteFrame);
        }
*/
    }

    /**
     * 强制刷新 uv。
     */
    private _markForUpdateUvDirty() {
        if (this._renderData) {
            this._renderData.uvDirty = true;
            this._renderDataFlag = true;
        }
    }

    /**
     * @zh
     * 精灵图集内的精灵替换
     *
     * @returns
     */
    public changeSpriteFrameFromAtlas (name:string) {
        if(this._atlas){
            const sprite = this._atlas!.getSpriteFrame(name);
            this._markForUpdateUvDirty();
            this._spriteFrame=sprite;  
            this.markForUpdateRenderData(true);
        }else{
            return;
        }
    }

}

cc.SpriteComponent = SpriteComponent;
