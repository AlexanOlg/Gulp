const fileinclude = require("gulp-file-include");
const imagemin = require("gulp-imagemin");

let projectFolder = require("path").basename(__dirname); // эту папку передаем заказчику ("dist")
let sourceFolder = "#src"; // папка с исходниками
let fs = require("fs");

// переменая с объектами, в которых прописаны пути к файлам и папкам
let path = {
	// формирование папки заказчика
	build: {
		html: projectFolder + "/",
		css: projectFolder + "/css/",
		js: projectFolder + "/js/",
		img: projectFolder + "/img/",
		fonts: projectFolder + "/fonts/",
	},
	// формирование папки с исходниками
	src: {
		html: [sourceFolder + "/*.html", `!${sourceFolder}/_*.html`],
		css: sourceFolder + "/scss/style.scss",
		js: sourceFolder + "/js/script.js",
		img: sourceFolder + "/img/**/*.{jpg, png, svg, gif, ico, webp}",
		fonts: sourceFolder + "/fonts/*.ttf",
	},
	// слушатели
	watch: {
		html: sourceFolder + "/**/*.html",
		css: sourceFolder + "/scss/**/*.scss",
		js: sourceFolder + "/js/**/*.js",
		img: sourceFolder + "/img/**/*.{jpg, png, svg, gif, ico, webp}",
	},
	clean: "./" + projectFolder + "/"
}

let { src, dest } = require("gulp"),
	gulp = require("gulp"),
	browsersync = require("browser-sync").create(),
	fileInclude = require("gulp-file-include"),
	del = require("del"),
	scss = require("gulp-sass"),
	autoprefixer = require("gulp-autoprefixer"),
	groupMedia = require('gulp-group-css-media-queries'),
	cleanCSS = require('gulp-clean-css'),
	rename = require("gulp-rename"),
	uglify = require("gulp-uglify-es").default,
	babel = require("gulp-babel"),
	webp = require("gulp-webp"),
	webphtml = require("gulp-webp-html"),
	webpcss = require("gulp-webpcss"),
	svgSprite = require("gulp-svg-sprite"),
	ttf2woff = require("gulp-ttf2woff"),
	ttf2woff2 = require("gulp-ttf2woff2"),
	fonter = require("gulp-fonter");

// функция обновления браузера
function browserSync(params) {
	browsersync.init({
		server: {
			baseDir: "./" + projectFolder + "/"
		},
		port: 4000,
		notify: false
	})
}

// функция работы с html(чтоб в dist отобразился файл html)
function html() {
	return src(path.src.html)
		.pipe(fileInclude())
		.pipe(webphtml())
		.pipe(dest(path.build.html))
		.pipe(browsersync.stream())
}

function css() {
	return src(path.src.css)
		.pipe(
			scss({
				outputStyle: "expanded"
			})
		)
		.pipe(
			groupMedia()
		)
		.pipe(
			autoprefixer({
				overrideBrowserslist: ["last 5 versions"],
				cascade: true
			})
		)
		.pipe(webpcss({webpClass: '.webp',noWebpClass: '.no-webp'}))
		.pipe(dest(path.build.css))
		.pipe(cleanCSS())
		.pipe(
			rename({
				extname: ".min.css"
			})
		)
		.pipe(dest(path.build.css))
		.pipe(browsersync.stream())
}

function images() {
	return src(path.src.img)
		.pipe(
			webp({
				quality: 70
			})
		)
		.pipe(dest(path.build.img))
		.pipe(src(path.src.img))
		.pipe(
			imagemin({
				interlaced: true,
				progressive: true,
				optimizationLevel: 3,
				svgoPlugins: [{ removeViewBox: false }]
			})
		)
		.pipe(dest(path.build.img))
		.pipe(browsersync.stream())
}

function js() {
	return src(path.src.js)
		.pipe(fileInclude())
		.pipe(dest(path.build.js))
		.pipe(
			uglify()
		)
		.pipe(
			rename({
				extname: ".min.js"
			})
		)
		.pipe(babel({
			presets: ["@babel/preset-env"]
		}))
		.pipe(dest(path.build.js))
		.pipe(browsersync.stream())
}

function fonts() {
	src(path.src.fonts)
		.pipe(ttf2woff())
		.pipe(dest(path.build.fonts))
	return src(path.src.fonts)
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts))
}

// наподобие задачи svgSprite задача fonter с otf формате запускается отдельно
// но запустить задачу нужно один раз вначале - должен появиться в папке с исходниками
// fonts файл с расширением ttf 
// иначе говоря - это конвертация otf в ttf
gulp.task("otf2ttf", function () {
	return src([sourceFolder + "/fonts/*.otf"])
		.pipe(fonter({
			formats: ["ttf"]
		}))
		.pipe(dest(sourceFolder + "/fonts/"));
})

// в первом терминале запустить задачу gulp
// во втором терминале запустить задачу gulp svgSprite
// все картинки формата svg из папки iconsprite соберутся в один спрайт
// как подключать такие спрайты в файле html смотреть в dist-stack-sprite.stack.html
gulp.task("svgSprite", function () {
	return gulp.src([sourceFolder + "/iconsprite/*.svg"])
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: "../icons/icons.svg",
					example: true
				}
			},
		}
		))
		.pipe(dest(path.build.img))
})

function fontsStyle(params) {
	let file_content = fs.readFileSync(sourceFolder + '/scss/fonts.scss');
	if (file_content == '') {
		fs.writeFile(sourceFolder + '/scss/fonts.scss', '', cb);
		return fs.readdir(path.build.fonts, function (err, items) {
			if (items) {
				let c_fontname;
				for (var i = 0; i < items.length; i++) {
					let fontname = items[i].split('.');
					fontname = fontname[0];
					if (c_fontname != fontname) {
						fs.appendFile(sourceFolder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
					}
					c_fontname = fontname;
				}
			}
		})
	}
}
function cb() { }
// Чтоб на лету обновлась страница при обновлении файла
function watchFiles(params) {
	gulp.watch([path.watch.html], html);
	gulp.watch([path.watch.css], css);
	gulp.watch([path.watch.js], js);
	gulp.watch([path.watch.img], images);
}

// Для автоматического удаления ненужных файлов из папки dist
function clean(params) {
	return del(path.clean);
}

let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts), fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;