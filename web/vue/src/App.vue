<template>
  <div style="padding:20px;font-family:system-ui">
    <h1>Vue Practice</h1>
    <input v-model="text" placeholder="Type something" />
    <button @click="show">Alert</button>
    <p>Try editing <code>src/App.vue</code> and see HMR.</p>
  </div>
</template>

<script>
export default {
  data(){
    return { text: '' }
  },
  methods:{
    show(){ alert(`You typed: ${this.text}`) }
  }
}
</script>
