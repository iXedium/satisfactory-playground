export const findAffectedBranches = (tree, changedNodeId, path = []) => {
    const affected = [];
    // If this is the changed node, mark this entire branch INCLUDING all children
    if (tree.uniqueId === changedNodeId) {
        affected.push({ nodeId: tree.uniqueId, path });
        // Add all children of the changed node to affected branches
        const getAllChildNodes = (node, currentPath) => {
            const nodes = [];
            node.children?.forEach((child, index) => {
                const childPath = [...currentPath, index.toString()];
                nodes.push({ nodeId: child.uniqueId, path: childPath });
                nodes.push(...getAllChildNodes(child, childPath));
            });
            return nodes;
        };
        affected.push(...getAllChildNodes(tree, path));
        return affected;
    }
    // Recursively check children
    tree.children?.forEach((child, index) => {
        const childPath = [...path, index.toString()];
        const childAffected = findAffectedBranches(child, changedNodeId, childPath);
        affected.push(...childAffected);
    });
    // If any children are affected, this node is affected
    if (affected.length > 0) {
        affected.unshift({ nodeId: tree.uniqueId, path });
    }
    return affected;
};
