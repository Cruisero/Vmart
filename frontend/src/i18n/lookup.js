export function getByPath(source, path) {
    return String(path || '').split('.').reduce((current, part) => (
        current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : undefined
    ), source)
}

export function formatMessage(template, values = {}) {
    return Object.entries(values).reduce((text, [key, value]) => (
        text
            .replaceAll(`{{${key}}}`, String(value))
            .replaceAll(`{${key}}`, String(value))
    ), String(template ?? ''))
}
