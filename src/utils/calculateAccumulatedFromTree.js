export const calculateAccumulatedFromTree = (tree, results = {}) => {
    // Skip root node as it's what we're trying to make
    if (!tree.isRoot) {
        results[tree.id] = (results[tree.id] || 0) + tree.amount;
    }
    // Recursively process all children
    if (tree.children) {
        tree.children.forEach(child => {
            calculateAccumulatedFromTree(child, results);
        });
    }
    return results;
};
