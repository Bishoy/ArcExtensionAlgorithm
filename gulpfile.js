var gulp = require('gulp');
var userref = require('gulp-useref');


gulp.task('publish', function () {
    
    //copy fonts
    
    gulp.src('bower_components/bootstrap/dist/fonts/*.*').pipe(gulp.dest('publish/fonts'));
    
    // copy and prepare html
    
    gulp.src('*.html')
        .pipe(userref())
        .pipe(gulp.dest('publish'));
    

});


gulp.task('default', ['publish'], function () {



});