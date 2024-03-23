let documentationCardIsVisible = localStorage.getItem('documentation-card-visible')
if (documentationCardIsVisible === 'true') {
    const content = document.querySelector('#documentation-card .content');
    content.classList.add('visible');

    const title = document.querySelector('#documentation-card h2');
    title.classList.add('open');
}
document.getElementById('documentation-card-toggle').addEventListener('click', toggleDocumentationCard);
function toggleDocumentationCard() {
    const content = document.querySelector('#documentation-card .content');
    const title = document.querySelector('#documentation-card h2');
    if (content.classList.contains('visible')) {
        content.classList.remove('visible');
        title.classList.remove('open');
        localStorage.setItem('documentation-card-visible', 'false');
    } else {
        content.classList.add('visible');
        title.classList.add('open');
        localStorage.setItem('documentation-card-visible', 'true');
    }
}