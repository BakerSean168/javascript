document.getElementById('btn').addEventListener('click', ()=>{
  const t = document.getElementById('text').value;
  const out = document.getElementById('output');
  out.textContent = `You typed: ${t}`;
  console.log('Button clicked, input:', t);
});
