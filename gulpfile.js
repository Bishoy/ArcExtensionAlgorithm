var gulp = require('gulp');
var userref = require('gulp-useref');


gulp.task('publish', function () {
    
//    // copy bower files 
//    gulp.src('./bower.json')
//        .pipe(mainBowerFiles({
//            overrides: {
//                bootstrap: {
//                    main: [
//                        './dist/js/bootstrap.min.js',
//                        './dist/css/*.min.*',
//                        './dist/fonts/*.*'
//                    ]
//                }
//            }
//            }))
//        .pipe(gulp.dest('templibs'));
//    
//    // copy custom js files
//    gulp.src('arc*.js')
//        .pipe(gulp.dest('templibs/js'));
//    
//    
//    // CSS files
//    gulp.src('*.css')
//        .pipe(gulp.dest('templibs/css'));
//    
//    // aggregate all js and CSS
//    
//    gulp.src('templibs/**/*.css')
//        .pipe(gulp.dest('publish/allcss'));
//    
//    gulp.src('templibs/**/*.js')
//        .pipe(gulp.dest('publish/alljs')); 
    
    
    //copu fonts
    
    gulp.src('bower_components/bootstrap/dist/fonts/*.*').pipe(gulp.dest('publish/fonts'));
    
    // copy and prepare html
    
    gulp.src('*.html')
        .pipe(userref())
        .pipe(gulp.dest('publish'));
    
   

});


gulp.task('default', ['publish'], function () {



});