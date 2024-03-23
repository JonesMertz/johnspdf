require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function () {
    const options = {
        language: 'html',
        minimap: { enabled: false },
        automaticLayout: true
    }
    window.editors = {
        headerEditor: monaco.editor.create(document.getElementById('header-editor'), {
            ...options,
            value: ["<table>", "  <tr>", "    <td>", "      This is a header", "    </td>", "    <td>", "      <h1>Company Name</h1>", "    </td>", "  </tr>", "</table>"].join('\n'),
        }),
        bodyEditor: monaco.editor.create(document.getElementById('body-editor'), {
            ...options,
            value: ['<h1 style="text-align:center">', "  This is my first PDF", "</h1>"].join('\n'),
        }),
        footerEditor: monaco.editor.create(document.getElementById('footer-editor'), {
            ...options,
            value: ['<h2>', '   <span class="pageNumber"></span>', "   of", '   <span class="totalPages"></span>', "</h2>"].join('\n'),
        })
    };
});