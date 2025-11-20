/**
 * Drag and drop functionality for tab reordering
 */

/**
 * Handle drag start event
 */
function handleDragStart(e) {
  // Don't start drag if clicking on interactive elements
  const target = e.target;
  if (target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('input')) {
    e.preventDefault();
    return;
  }

  const tabId = e.currentTarget.dataset.tabId;
  state.draggedTabId = tabId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', tabId);
}

/**
 * Handle drag end event
 */
function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  state.draggedTabId = null;
  // Remove all drag-over classes
  document.querySelectorAll('.tab-item').forEach(el => {
    el.classList.remove('drag-over');
  });
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (!target.classList.contains('dragging')) {
    target.classList.add('drag-over');
  }
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop event
 */
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  const draggedTabId = state.draggedTabId;
  const targetTabId = e.currentTarget.dataset.tabId;

  if (draggedTabId && targetTabId && draggedTabId !== targetTabId) {
    // Reorder tabs
    const draggedIndex = state.tabOrder.indexOf(draggedTabId);
    const targetIndex = state.tabOrder.indexOf(targetTabId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      state.tabOrder.splice(draggedIndex, 1);
      const newTargetIndex = state.tabOrder.indexOf(targetTabId);
      state.tabOrder.splice(newTargetIndex, 0, draggedTabId);
      renderTabs();
    }
  }
}
