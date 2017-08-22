// copied from units/ui/MonacoEditor.html

app.directive('uiMonacoeditor', uiMonacoeditorDirective)

function uiMonacoeditorDirective($timeout, uiMonacoeditorConfig) {
    return {
        restrict: 'EA',
        require: '?ngModel',
        compile: function compile() {
            // Omit checking "Require MonacoEditor"
            return postLink;
        }
    };

    function postLink(scope, iElement, iAttrs, ngModel) {
        // require(["vs/editor/editor.main"], function () {
            var monacoeditorOptions = angular.extend(
                { value: iElement.text() },
                uiMonacoeditorConfig.monacoeditor || {},
                scope.$eval(iAttrs.uiMonacoeditor),
                scope.$eval(iAttrs.uiMonacoeditorOpts)
            )

            var monacoeditor = newMonacoeditorEditor(iElement, monacoeditorOptions);

            configOptionsWatcher(
                monacoeditor,
                iAttrs.uiMonacoeditor || iAttrs.uiMonacoeditorOpts,
                scope
            )
            
            configNgModelLink(monacoeditor, ngModel, scope);

            // {to do}: add configUiRefreshAttribute
            // {to do}: add broadcasted event

            // onLoad callback
            if (angular.isFunction(monacoeditorOptions.onLoad)) {
                monacoeditorOptions.onLoad(monacoeditor)
            }
        // })
    }

    // {to do}: write the case of textarea like ui-codemirror
    // {to do}: should use monacoeditorOptions
    function newMonacoeditorEditor(iElement, monacoeditorOptions) {
        var editor = monaco.editor.create(iElement[0], {
            language: monacoeditorOptions.language,
            lineNumbers: monacoeditorOptions.lineNumbers,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false
        });
        console.log("newMonacoeditorEditor")
        return editor
    }

    function configOptionsWatcher(monacoeditor, uiMonacoeditorAttr, scope) {
        if (!uiMonacoeditorAttr) { return; }

        // var monacoeditorDefaultsKeys = Object.keys(window.MonacoEditor.defaults);
        // {to do}: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditorconstructionoptions.html
        var monacoeditorDefaultsKeys = ["language", "lineNumbers"] 
        scope.$watch(uiMonacoeditorAttr, updateOptions, true)
        function updateOptions (newValues, oldValues) {
            console.log("$watch, uiMonacoeditorAttr, oldValues: " + JSON.stringify(oldValues));
            console.log("$watch, uiMonacoeditorAttr, newValues: " + JSON.stringify(newValues));
            if (!angular.isObject(newValues)) { return; }
            monacoeditorDefaultsKeys.forEach(function (key) {
                if (newValues.hasOwnProperty(key)) {
                    if (oldValues && newValues[key] === oldValues[key]) {
                        return
                    }
                    console.log(key + "    " + newValues[key])
                    // {to do}: should write something more general; monacoeditor.updateOptions(key, newValues[key])
                    switch (key) {
                        case "lineNumbers":
                            monacoeditor.updateOptions({ "lineNumbers": newValues[key] });
                            break;
                        case "language":
                            monaco.editor.setModelLanguage(monacoeditor.getModel(), newValues[key])
                            break
                    }
                }
            })
        }
    }

    function configNgModelLink(monacoeditor, ngModel, scope) {
        console.log("configNgModelLink")
        if (!ngModel) { return; }
        // Monaco Editor expects a string, so make sure it gets one.
        // This does not change the model.
        ngModel.$formatters.push(function (value) {
            console.log("ngModel.$formatters")
            if (angular.isUndefined(value) || value === null)
                return '';
            else if (angular.isObject(value) || angular.isArray(value))
                throw new Error('ui-monacoeditor cannot use an object or an array as a model');
            return value	
        });

        // Override the ngModelController $render method, which is what gets called when the model is updated.
        // This takes care of the synchronizing the monacoEditor element with the underlying model, in the case that it is changed by something else.
        ngModel.$render = function () {
            console.log("ngModel.$render");
            // Monaco Editor expects a string so make sure it gets one
            // Although the formatter has already done this, it can be possible that another formatter returns undefined (for example the required directive)
            var safeViewValue = ngModel.$viewValue || '';
            monacoeditor.setValue(safeViewValue);
        };

        // Keep the ngModel in sync with changes from MonacoEditor
        monacoeditor.onDidChangeModelContent(function (e) {
            var newValue = monacoeditor.getValue();
            console.log("onDidChangeModelContent " + newValue)
            if (newValue !== ngModel.$viewValue) {
                scope.$evalAsync(function () {
                    ngModel.$setViewValue(newValue)
                })
            }
        })
    }
}