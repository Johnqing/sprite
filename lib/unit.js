var fs = require('fs');
var path = require('path');
var iconv = require('iconv-lite');
/**
 * 继承
 * @param old
 * @param neo
 * @returns {*}
 */
exports.extend = function(old, neo){
	for(var key in neo)
		old[key] = neo[key];

	return old;
}
/**
 * 日期格式化
 * @param  {Date} text   需要格式化的日期
 * @param  {String} fs 日期格式。如：yyyy-MM-dd
 * @return {String}        格式化后的日期
 */
exports.formatDate = function(text, fs){
	fs = fs || formatString;
	var format;
	var y = text.getFullYear().toString(),
		o = {
			M: text.getMonth()+1, //month
			d: text.getDate(), //day
			h: text.getHours(), //hour
			m: text.getMinutes(), //minute
			s: text.getSeconds() //second
		};
	format = fs.replace(/(y+)/ig, function(a, b) {
		return y.substr(4 - Math.min(4, b.length));
	});
	for (var i in o) {
		format = format.replace(new RegExp('(' + i + '+)', 'g'), function(a, b) {
			return (o[i] < 10 && b.length > 1) ? '0' + o[i] : o[i];
		});
	}
	return format;
}

var file = {
	preserveBOM: false,
	nowrite: false
}
// Match a filepath or filepaths against one or more wildcard patterns. Returns
// true if any of the patterns match.
file.isMatch = function() {
	return file.match.apply(file, arguments).length > 0;
};
// Read a file, return its contents.
file.read = function(filepath, options) {
	if (!options) { options = {}; }
	var contents;
	try {
		contents = fs.readFileSync(String(filepath));
		// If encoding is not explicitly null, convert from encoded buffer to a
		// string. If no encoding was specified, use the default.
		if (options.encoding !== null) {
			contents = iconv.decode(contents, options.encoding || 'utf-8');
			// Strip any BOM that might exist.
			if (!file.preserveBOM && contents.charCodeAt(0) === 0xFEFF) {
				contents = contents.substring(1);
			}
		}
		return contents;
	} catch(e) {
		throw new Error('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').', e);
	}
};
var pathSeparatorRe = /[\/\\]/g;


file.exists = function() {
	var filepath = path.join.apply(path, arguments);
	return fs.existsSync(filepath);
};

// Like mkdir -p. Create a directory and any intermediary directories.
file.mkdir = function(dirpath, mode) {
	if (file.nowrite) { return; }
	// Set directory mode in a strict-mode-friendly way.
	if (mode == null) {
		mode = parseInt('0777', 8) & (~process.umask());
	}
	dirpath.split(pathSeparatorRe).reduce(function(parts, part) {
		parts += part + '/';
		var subpath = path.resolve(parts);
		if (!file.exists(subpath)) {
			try {
				fs.mkdirSync(subpath, mode);
			} catch(e) {
				throw new Error('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
			}
		}
		return parts;
	}, '');
};

// Write a file.
file.write = function(filepath, contents, options) {
	if (!options) { options = {}; }
	var nowrite = file.nowrite;

	// Create path, if necessary.
	file.mkdir(path.dirname(filepath));
	try {
		// If contents is already a Buffer, don't try to encode it. If no encoding
		// was specified, use the default.
		if (!Buffer.isBuffer(contents)) {
			contents = iconv.encode(contents, options.encoding || file.defaultEncoding);
		}
		// Actually write file.
		if (!nowrite) {
			fs.writeFileSync(filepath, contents);
		}
		return true;
	} catch(e) {
		throw new Error('Unable to write "' + filepath + '" file (Error code: ' + e.code + ').', e);
	}
};
// Read a file, optionally processing its content, then write the output.
file.copy = function(srcpath, destpath, options) {
	if (!options) { options = {}; }
	// If a process function was specified, and noProcess isn't true or doesn't
	// match the srcpath, process the file's source.
	var process = options.process && options.noProcess !== true &&
		!(options.noProcess && file.isMatch(options.noProcess, srcpath));
	// If the file will be processed, use the encoding as-specified. Otherwise,
	// use an encoding of null to force the file to be read/written as a Buffer.
	var readWriteOptions = process ? options : {encoding: null};
	// Actually read the file.
	var contents = file.read(srcpath, readWriteOptions);
	if (process) {
		try {
			contents = options.process(contents, srcpath);
		} catch(e) {
			throw new Error('Error while processing "' + srcpath + '" file.', e);
		}
	}
	// Abort copy if the process function returns false.
	if (contents === false) {
		console.log('Write aborted.');
	} else {
		file.write(destpath, contents, readWriteOptions);
	}
};
exports.file = file;


var async = {};
/**
 * 遍历
 * @param arr
 * @param iterator
 * @param callback
 * @returns {*}
 */
async.forEachSeries = function (arr, iterator, callback) {
	callback = callback || function () {};
	if (!arr.length) {
		return callback();
	}
	var completed = 0;
	var iterate = function () {
		iterator(arr[completed], function (err) {
			if (err) {
				callback(err);
				callback = function () {};
			}
			else {
				completed += 1;
				if (completed === arr.length) {
					callback(null);
				}
				else {
					iterate();
				}
			}
		});
	};
	iterate();
};
exports.async = async;