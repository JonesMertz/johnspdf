document.getElementById('converter-form').addEventListener('submit', function (event) {
    event.preventDefault();
    debugger

    /* let headerHtml = document.getElementById('header-editor').value;
    let mainHtml = document.getElementById('body-editor').value;
    let footerHtml = document.getElementById('footer-editor').value; */
    let headerHtml = window.editors.headerEditor.getValue();
    let mainHtml = window.editors.bodyEditor.getValue();
    let footerHtml = window.editors.footerEditor.getValue();
    let format = document.getElementById('format').value;
    let landscape = document.getElementById('landscape').checked;
    let marginTop = document.getElementById('margin-top').value;
    let marginBottom = document.getElementById('margin-bottom').value;
    let marginLeft = document.getElementById('margin-left').value;
    let marginRight = document.getElementById('margin-right').value;

    fetch('/pdf:5500', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            header: headerHtml,
            html: mainHtml,
            footer: footerHtml,
            format: format,
            landscape: landscape,
            margin: {
                top: marginTop,
                bottom: marginBottom,
                left: marginLeft,
                right: marginRight
            }
        })
    })
        .then(response => response.blob())
        .then(blob => {
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'output';
            a.click();
        })
        .catch(error => {
            document.getElementById('result').textContent = 'Error: ' + error;
        });
});