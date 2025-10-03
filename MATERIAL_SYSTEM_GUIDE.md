# 材质和纹理系统使用指南

## 概述

我们为Vue.js CAD应用程序实现了一个完整的材质和纹理管理系统，支持：

- 🎨 **预设材质库** - 包含金属、塑料、玻璃等常用材质
- 🖼️ **自定义纹理** - 支持上传图片作为纹理
- 🔄 **纹理平铺** - 自动调整纹理重复以填充表面
- ⚡ **性能优化** - 材质缓存和内存管理

## 功能特性

### 1. 预设材质库

系统内置了多种预设材质：

#### 基础材质
- **默认材质** - 标准灰色材质
- **塑料** - 白色塑料材质
- **橡胶** - 黑色橡胶材质
- **玻璃** - 透明玻璃材质
- **木材** - 棕色木材材质
- **混凝土** - 灰色混凝土材质

#### 金属材质
- **金属** - 银色金属
- **黄金** - 金色金属
- **白银** - 银色金属
- **铜** - 铜色金属

#### 彩色材质
- **红色**、**绿色**、**蓝色**、**黄色**
- **白色**、**黑色**

### 2. 自定义纹理

#### 支持的图片格式
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

#### 纹理设置
- **重复模式**：
  - 拉伸 - 直接拉伸纹理填充表面
  - 平铺 - 重复纹理以完全覆盖表面
  - 保持比例 - 保持纹理比例，使用较大的重复次数

- **重复次数** - 控制纹理在X和Y方向的重复次数
- **偏移** - 调整纹理的起始位置
- **旋转** - 旋转纹理角度
- **金属度** - 控制材质的金属感
- **粗糙度** - 控制材质的粗糙程度

## 使用方法

### 1. 在代码中使用

```javascript
import { materialManager } from './packages/cad-three/MaterialManager.js'
import { BoxVisualObject } from './packages/cad-three/BasicShapes.js'

// 创建对象
const box = new BoxVisualObject()

// 使用预设材质
await box.setMaterial('gold')

// 使用自定义纹理
const file = document.getElementById('texture-file').files[0]
await box.setTextureFromFile(file, {
  repeatX: 2,
  repeatY: 2,
  metalness: 0.3,
  roughness: 0.7
})

// 从URL加载纹理
await box.setTextureFromUrl('https://example.com/texture.jpg', {
  fitMode: 'tile'
})
```

### 2. 在UI中使用

1. **打开材质演示页面**：
   - 在主界面点击 `View` → `Material Demo`
   - 或直接访问 `/material-demo`

2. **创建立方体或球体**：
   - 点击 "创建立方体" 或 "创建球体" 按钮

3. **选择材质**：
   - 在右侧面板选择 "预设材质" 或 "自定义纹理" 标签
   - 选择预设材质或上传图片文件
   - 调整纹理设置（如果使用自定义纹理）
   - 点击 "应用材质" 按钮

4. **查看效果**：
   - 对象会立即应用新材质
   - 可以创建多个对象测试不同材质

### 3. 在属性面板中使用

1. **选择对象**：
   - 在3D场景中点击选择对象

2. **打开属性面板**：
   - 在右侧面板查看 "Material" 部分

3. **使用材质选择器**：
   - 选择预设材质或上传自定义纹理
   - 调整材质属性
   - 材质会实时应用到选中的对象

## 技术实现

### 核心组件

1. **MaterialManager** (`src/packages/cad-three/MaterialManager.js`)
   - 材质和纹理管理核心类
   - 预设材质库管理
   - 纹理加载和处理
   - 材质缓存系统

2. **MaterialSelector** (`src/packages/cad-ui/components/MaterialSelector.vue`)
   - 材质选择UI组件
   - 预设材质展示
   - 文件上传界面
   - 纹理设置控制

3. **VisualObject** (更新)
   - 集成材质管理功能
   - 支持材质状态切换
   - 序列化/反序列化支持

### 材质状态管理

系统支持三种材质状态：
- **default** - 默认状态
- **selected** - 选中状态（红色高亮）
- **highlighted** - 悬停状态（蓝色高亮）

### 性能优化

- **材质缓存** - 相同配置的材质会被缓存复用
- **纹理缓存** - 相同URL的纹理会被缓存
- **内存管理** - 自动清理未使用的材质和纹理
- **LOD支持** - 支持不同细节级别的纹理

## 扩展功能

### 添加新的预设材质

```javascript
// 在MaterialManager中添加新材质
this._presetMaterials.set('custom', {
  name: '自定义材质',
  type: 'standard',
  config: {
    color: 0x00ff00,
    metalness: 0.5,
    roughness: 0.3
  }
})
```

### 自定义材质配置

```javascript
// 创建自定义材质配置
const customConfig = {
  color: 0xff0000,
  metalness: 0.8,
  roughness: 0.2,
  transparent: true,
  opacity: 0.8
}

await visualObject.setMaterial(customConfig)
```

## 测试

运行材质系统测试：

```bash
npm run test:unit tests/unit/MaterialManager.test.js
```

测试覆盖：
- 预设材质管理
- 材质创建和缓存
- 纹理计算和处理
- 缓存管理
- 全局实例

## 故障排除

### 常见问题

1. **纹理不显示**
   - 检查图片文件格式是否支持
   - 确认文件大小不超过限制
   - 检查网络连接（如果使用URL）

2. **材质不应用**
   - 确认对象已正确创建
   - 检查材质ID是否正确
   - 查看浏览器控制台错误信息

3. **性能问题**
   - 使用适当分辨率的纹理图片
   - 避免同时加载过多大尺寸纹理
   - 定期清理缓存

### 调试信息

在浏览器控制台中查看：
- 材质管理器缓存统计
- 纹理加载状态
- 材质应用日志

```javascript
// 查看缓存统计
console.log(materialManager.getCacheStats())

// 清理缓存
materialManager.clearCache()
```

## 未来计划

- [ ] 支持更多图片格式
- [ ] 添加材质预览功能
- [ ] 实现材质库导入/导出
- [ ] 添加材质动画支持
- [ ] 支持法线贴图和高度贴图
- [ ] 实现材质编辑器
