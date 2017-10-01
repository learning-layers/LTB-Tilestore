/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        
        copy: {
            mob: {
                files: [
                    {
                        cwd: 'app/www',  // set working folder / root to copy
                        src: '**/*',           // copy all files and subfolders
                        dest: 'phonegap/www',    // destination folder
                        expand: true           // required when using cwd
                    },
                    {
                        cwd: 'phonegap',  // set working folder / root to copy
                        src: 'config.xml',           // copy all files and subfolders
                        dest: 'phonegap/www',    // destination folder
                        expand: true           // required when using cwd
                    }
                ]
            }
        },
        clean: {
            pre: [
                'phonegap/www/',
                'phonegap/www.zip'
            ],
            post: [
                'phonegap/www/bower_components/angular-qrcode/',
                'phonegap/www/bower_components/modernizr/test/',
                'phonegap/www/bower_components/moment/'
            ]
        },
        compress: {
            main: {
                options: {
                  archive: 'phonegap/www.zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: 'phonegap/www',
                        src: ['**/*'], 
                        dest: '/'
                    } // includes files in path and its subdirs
                ]
            }
        },
        version: grunt.file.readJSON('phonegap/version.json'),
        phonegap: grunt.file.readJSON('phonegap/settings.json'),
        
        "phonegap-build": {
            debug: {
                options: {
                    "archive": "phonegap/www.zip",
                    "appId": '<%= phonegap.appId %>',
                    "user": {
                        "email": '<%= phonegap.email %>',
                        "password": '<%= phonegap.password %>'
                    }
                }
            }
        },
        
        'string-replace': {
            config: {
              files: {
                'phonegap/config.xml': 'phonegap/config.xml'
              },
              options: {
                replacements: [
                    {
                      pattern: /(id="com\.raycom\.ltb"[\s]*version=")[0-9\.]*(")/,
                      replacement: '$1<%= version.version %>$2'
                    },
                    {
                      pattern: /(android-versionCode=")[0-9\.]*(")/,
                      replacement: '$1<%= version.androidversion %>$2'
                    },
                    {
                      pattern: /(ios-CFBundleVersion=")[0-9\.]*(")/,
                      replacement: '$1<%= version.version %>$2'
                    }
                ]
              }
            },
            viewer: {
                files: {
                    'app/www/viewerjs.html': 'app/www/bower_components/viewerjs/ViewerJS/index.html'
                },
                options: {
                    replacements: [
                        {
                            pattern: /"\.\//g,
                            replacement: '"bower_components/viewerjs/ViewerJS/'
                        },
                        {
                            pattern: /images\//g,
                            replacement: 'bower_components/viewerjs/ViewerJS/images/'
                        },
                        {
                            pattern: 'download" title',
                            replacement: 'download" style="display:none" title'
                        }
                    ]
                }
            },
            indexApp: {
              files: {
                'app/www/index.html': 'app/www/index.html'
              },
              options: {
                replacements: [
                    {
                      pattern: /(var version = ')[0-9\.]*(';)/,
                      replacement: '$1<%= version.version %>$2'
                    },
                    {
                        pattern: /(var deploy_date = ')[0-9\-\:\s]*(';)/,
                        replacement: '$1<%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %>$2'
                    },
                    {
                        pattern: /(var versionScript = ")[0-9\-\:]*(";)/,
                        replacement: '$1<%= grunt.template.today("yyyymmddHHMMss") %>$2'
                    },
                    {
                        pattern: /\?v=[0-9_A-Z]*"/g,
                        replacement: '?v=<%= grunt.template.today("yyyymmddHHMMss") %>"'
                    }
                ]
              }
            },
            indexWeb: {
              files: {
                'app/index.html': 'app/index.html'
              },
              options: {
                replacements: [
                    {
                      pattern: /(var version = ')[0-9\.]*(';)/,
                      replacement: '$1<%= version.version %>$2'
                    },
                    {
                        pattern: /(var deploy_date = ')[0-9\-\:\s]*(';)/,
                        replacement: '$1<%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %>$2'
                    },
                    {
                        pattern: /(var versionScript = ")[0-9\-\:]*(";)/,
                        replacement: '$1<%= grunt.template.today("yyyymmddHHMMss") %>$2'
                    },
                    {
                        pattern: /\?v=[0-9_A-Z]*"/g,
                        replacement: '?v=<%= grunt.template.today("yyyymmddHHMMss") %>"'
                    }
                ]
              }
            },
            indexAppPhonegap: {
              files: {
                'phonegap/www/index.html': 'phonegap/www/index.html'
              },
              options: {
                replacements: [
                    {
                        pattern: /(<!-- WEB: )(-->)(.*)/,
                        replacement: '$1$3$2'
                    },
                    {
                        pattern: /(<!-- APP: )(.*)(-->)/,
                        replacement: '$1$3$2'
                    }
                ]
              }
            }
        },
        
        nggettext_extract: {
            pot: {
                files: {
                    'po/language.pot': [
                        'app/www/assets/*.html',
                        'app/www/components/*/*.html',
                        'app/www/components/*/*/*.html',
                        'app/www/modules/*/*.html',
                        'app/www/components/*/*.js',
                        'app/www/components/*/*/*.js',
                        'app/www/modules/*/*.js'
                    ]
                }
            }
        },
        nggettext_compile: {
            all: {
                options: {
                    format: "json"
                },
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: "po",
                        dest: "app/www/languages",
                        src: ["*.po"],
                        ext: ".json"
                    }
                ]
            }            
        }
    });
    
    grunt.loadNpmTasks('grunt-angular-gettext');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-phonegap-build');
    grunt.loadNpmTasks('grunt-string-replace');
    
    grunt.registerTask('gettext');
    grunt.registerTask('build-app', function(target) {
        var version = grunt.config.get('version');
        var vp = version.version.split(".");
        version.androidversion = 10000*parseInt(vp[0])+100*parseInt(vp[1])+parseInt(vp[2]);
        grunt.config.set('version', version);
        //update language files from raw po
        grunt.task.run('nggettext_compile');
        //some pre cleaning
        grunt.task.run('clean:pre');
        
        //replace strings, version etc.
        grunt.task.run('string-replace:config');
        grunt.task.run('string-replace:indexApp');
        grunt.task.run('string-replace:indexWeb');
        
        //customise viewerjs viewer
        grunt.task.run('string-replace:viewer');
        
        //copy files to phonegap folder
        grunt.task.run('copy:mob');
        
        //after cleaning and small edits
        grunt.task.run('string-replace:indexAppPhonegap');
        grunt.task.run('clean:post');
        
        //create ZIP
        grunt.task.run('compress');
        
        //send to build.phonegap.com
//        grunt.task.run('phonegap-build:debug');
    });
    grunt.registerTask('phonegap-build-upload', function(target){
        grunt.task.run('phonegap-build:debug');
    });
    
};
