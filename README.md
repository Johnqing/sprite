css sprite
======
将css代码中的切片合并成雪碧图的工具

## 功能
1. 对css文件进行处理，收集切片序列，生成雪碧图
2. 在原css代码中为切片添加`background-position`属性
3. 在引用雪碧图的位置打上当然雪碧图md5后的版本号

## 使用

```
npm install css-sprites
```

## 调用

```
var cssSprites = require('css-sprites');

cssSprites({
	src: 'test/css/icon.css',
	dest: 'test/publish/css/',
	ext: '.x.css'
},{
	// sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
	imagepath: 'test/slice/',
	// 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
	spritedest: 'test/publish/images/',
	// 替换后的背景路径，默认 ../images/
	spritepath: '../images/',
	// 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
	padding: 2,
	// 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
	newsprite: false,
	// 给雪碧图追加md5后的版本号，默认不追加
	spritestamp: true,
	// 默认使用二叉树最优排列算法
	algorithm: 'binary-tree',
	// 默认使用`pngsmith`图像处理引擎
	engine: 'pngsmith'
});
```