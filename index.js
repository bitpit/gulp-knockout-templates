/*
 gulp-knockout-templates
 Author: Olga Kobets (HamsterCoder), Evan Ricketts (bitpit)
 License: MIT (http://www.opensource.org/licenses/mit-license)
 Version 0.0.5
 */

const fs = require('fs');
const glob = require('glob');
const evs = require('event-stream');
const gulpUtil = require('gulp-util');

const includeMarker = '<!-- Gulp Knockout Templates -->';
const removeDocsRegex = /\<\!\-\-\s?parameters:[\s\S]*?\-\-\>/;

/**
 * Templates may have descriptions in format <!-- parameters: ... -->,
 * these descriptions tend to get bulky, so it is nice to remove those when building production version.
 * Other comments are not affected by this simple cleanup.
 */
const removeDocsFromTemplate = (template, debug) =>
    template.replace(removeDocsRegex, match => {
        if (debug) {
            gulpUtil.log('Removed docs', match);
        }

        return '';
    });


function includeTemplatesAtIndex(output, settings) {

    const debug = parseSetting(settings, 'debug', false);
    const removeDocs = parseSetting(settings, 'removeDocs', false);
    const suffix = parseSetting(settings, 'suffix', '.tmpl.html');
    const path = parseSetting(settings, 'path', './');
    const defaultPath = parseSetting(settings, 'defaultPath', path);


    const includeIndex = output.indexOf(includeMarker);

    if (includeIndex === -1) {
        gulpUtil.log('No include marker found.');
        return output;
    }

    let changedOutput = output.substring(0, includeIndex);
    const wildcard = path + '**/*' + suffix;

    const templates = glob.sync(wildcard);

    if (templates) {
        templates.forEach(function (templatePath) {

            const templateName = getTemplateName(templatePath, defaultPath, suffix);

            if (debug) {
                gulpUtil.log('Processing template', templateName);
            }

            let template = String(fs.readFileSync(templatePath));

            if (removeDocs) {
                template = removeDocsFromTemplate(template, debug);
            }

            changedOutput += `<script type="text/html" id="${templateName}">${template}</script>`;
        });
    } else {
        gulpUtil.log('No templates found at ', wildcard);
    }

    changedOutput += output.substring(includeIndex + includeMarker.length);

    return changedOutput;

}

function getTemplateName(templatePath, path, suffix) {
    return templatePath.substring(path.length, templatePath.length - suffix.length);
}

function parseSetting(settings, name, defaultValue) {
    return settings && typeof settings[name] !== 'undefined' 
        ? settings[name] 
        : defaultValue;
}

module.exports = function(settings){ 

    return evs.through(function(file) {

        if (file.isStream()) {
            this.emit('error', new gulpUtil.PluginError('gulp-knockout-templates', 'Currently streams are not supported.'));
        }

        let contents = String(file.contents);

        if (file.isBuffer()) {
            contents = includeTemplatesAtIndex(contents, settings);
            file.contents = new Buffer(contents);
        }

        this.emit('data', file);

    });
}
