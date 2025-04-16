// ... existing code ...
          // We found an existing byproduct root for the item we need to import.
          // This means a *non-byproduct* child needs this item, so we convert the byproduct root to a normal node.
          if (targetTreeNode.isByproduct) {
            // Create a new node object with isByproduct set to false
            const updatedTargetNode = { ...targetTreeNode, isByproduct: false };
            workingInitialTrees[targetTreeId] = updatedTargetNode;
          }

          // Convert children recursively
          for (const childId of Object.keys(importTreeNode.children)) {
            if (!alreadyImported[itemIdToImport]) {
              // Check if a creation promise for this item already exists
              // Use 'in' operator to correctly check for key existence
              if (itemIdToImport in pendingCreations) {
                // Wait for the existing promise to resolve
                const existingTreeId = await pendingCreations[itemIdToImport];
                if (existingTreeId) {
// ... existing code ...