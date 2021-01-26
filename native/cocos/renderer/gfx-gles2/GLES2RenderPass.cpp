/****************************************************************************
Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
#include "GLES2Std.h"
#include "GLES2RenderPass.h"
#include "GLES2Commands.h"

namespace cc {
namespace gfx {

GLES2RenderPass::GLES2RenderPass(Device *device)
: RenderPass(device) {
}

GLES2RenderPass::~GLES2RenderPass() {
}

bool GLES2RenderPass::initialize(const RenderPassInfo &info) {

    _colorAttachments = info.colorAttachments;
    _depthStencilAttachment = info.depthStencilAttachment;

    _gpuRenderPass = CC_NEW(GLES2GPURenderPass);
    _gpuRenderPass->colorAttachments = _colorAttachments;
    _gpuRenderPass->depthStencilAttachment = _depthStencilAttachment;

    _hash = computeHash();

    return true;
}

void GLES2RenderPass::destroy() {
    if (_gpuRenderPass) {
        CC_DELETE(_gpuRenderPass);
        _gpuRenderPass = nullptr;
    }
}

} // namespace gfx
} // namespace cc
