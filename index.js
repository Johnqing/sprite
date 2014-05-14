var spritesmith = require('spritesmith')
var path = require('path');
var crypto = require('crypto');

var unit = require('./lib/unit')

function version(text){
	var md5Text = crypto.createHash('md5').update(text).digest('hex')
	return md5Text.substring(md5Text.length-5);
}

var defaultConf = {
	// sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
	imagepath: 'images/slice/',
	// 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
	spritedest: 'images/',
	// 替换后的背景路径，默认 ../images/
	spritepath: '../images/',
	// 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
	padding: 0,
	// 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
	newsprite: false,
	// 给雪碧图追加时间戳，默认不追加
	spritestamp: false,
	// 默认使用二叉树最优排列算法
	algorithm: 'binary-tree',
	// 默认使用`pngsmith`图像处理引擎
	engine: 'pngsmith'
}

/**
 * css sprite
 * @param options
 */
var sprite = function(file, options){

	options = unit.extend(defaultConf, options);

	// 高清设备必须要空出2像素
	if(options.padding % 2 !== 0){
		options.padding += 1;
	}
	//
	function fixPath(path){
		return String(path).replace(/\\/g, '/').replace(/\/$/, '');
	}
	//
	function getSliceData(paths, data){
		var slicePath = fixPath(options.imagepath),
			imgRegx = /background(?:-image)?\s*:[^;]*?url\((["\']?)(?!https?|\/)?[^\)]+\1\)[^};]*;?/ig,
			urlRegx = /\((["\']?)([^\)]+)\1\)/i,
			cssList = data.match(imgRegx),
			sliceHash = {},
			sliceList = [],
			cssHash = {},
			inx = 0;

		if(cssList && cssList.length){
			cssList.forEach(function(css){
				var url = css.match(urlRegx)[2],
					imgName = path.basename(url),
					imgPath = path.join(paths, path.dirname(url)),
					imgFullPath = fixPath(path.join(imgPath, imgName));

				if(!sliceHash[imgFullPath] && fixPath(imgPath) === slicePath && unit.file.exists(imgFullPath)){
					sliceHash[imgFullPath] = true;
					sliceList[inx++] = imgFullPath;
				}
				cssHash[css] = imgFullPath;
			})
		}

		return {
			sliceHash: sliceHash,
			sliceList: sliceList,
			cssHash: cssHash,
			cssList: cssList
		}

	}

	/**
	 * 创建雪碧图
	 * @param sliceList
	 * @param fn
	 */
	function createSp(sliceList, fn){
		spritesmith({
			algorithm: options.algorithm,
			padding: options.padding,
			engine: options.engine,
			src: sliceList
		}, function(err, ret){
			if(err)
				return;

			fn && fn(ret);
		})
	}
	// css 更新
	function replaceCSS(data, sliceData, coords){

		var semicolonRegx = /;\s*$/,
			urlRegx = /\((["\']?)([^\)]+)\1\)/i,
			spriteImg = options.spritepath + path.basename(sliceData.destImg) + sliceData.destImgStamp,
			cssHash = sliceData.cssHash,
			cssList = sliceData.cssList;

		cssList.forEach(function(css){
			var coordData = coords[cssHash[css]];
			if(coordData){
				var newCss = css.replace(urlRegx, '('+ spriteImg +')');
				// Add a semicolon if needed
				if(!semicolonRegx.test(newCss)){
					newCss += ';';
				}
				newCss += 'background-position:-'+ coordData.x +'px -'+ coordData.y +'px;';
				data = data.replace(css, newCss);
			}
		})

		return data;
	}
	// 雪碧完成后的处理
	function doneSprite(data, destCss){
		unit.file.write(destCss, data);
		console.log('Done!');
	}

	// sprite 迭代
	function spriteIterator(){
		var src = file.src;
		var srcArr = src.split('.');
		var suffix = srcArr.pop() || 'css';
		var filename = path.basename(src, '.'+suffix);
		var timeNow = unit.formatDate(new Date(), 'yyyyMMdd');

		// 文件命名
		if(options.newsprite){
			filename += '-' + timeNow;
		}

		var destFile = file.dest + filename + file.ext;
		var fileData = unit.file.read(src);
		var sliceData = getSliceData(path.dirname(src), fileData);
		var sliceList = sliceData.sliceList;

		var destImg = sliceData.destImg = fixPath(path.join(options.spritedest, filename + '.png'));


		if(!sliceList || !sliceList.length){
			unit.file.copy(src, destFile);
			return;
		}
		// 创建sprite的回调
		function ctSpCallback(ret){
			// 写入图片
			unit.file.write(destImg, ret.image, {encoding: 'binary'});
			console.log('Done! [Created] -> ' + destImg);
			// 版本号更新
			var imgData = unit.file.read(destImg);
			var vs = 'v='+ version(imgData) + '.png';
			sliceData.destImgStamp = options.spritestamp ? '?' + vs : '';

			// 替换CSS
			var newCssData = replaceCSS(fileData, sliceData, ret.coordinates);
			doneSprite(newCssData, destFile);
		}

		createSp(sliceList, ctSpCallback);

	}

	spriteIterator();

}
/**
 * 批量更新
 * @param files
 * @param options
 */
var sprites = function(files, options){

	if(!Array.isArray(files))
		files = [files];

	files.forEach(function(item){
		sprite(item, options);
	})
}

module.exports = sprites;