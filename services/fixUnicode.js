function fixUnicode(value) {
    if (typeof value === "string") {
        try {
            return Buffer.from(value, "latin1").toString("utf8");
        } catch {
            return value;
        }
    }

    if (Array.isArray(value)) {
        return value.map(fixUnicode);
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => [
                key,
                fixUnicode(val),
            ])
        );
    }

    return value;
}

module.exports = {
    fixUnicode,
};