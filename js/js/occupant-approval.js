document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.pending-btn, .history-btn');
  const tabContents = document.querySelectorAll('.pending-approval-header, .history-approval-header');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach((content) => content.classList.remove('active'));

      const targetId = btn.dataset.target;
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
});