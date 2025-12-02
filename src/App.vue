<template>
  <q-layout view="hHh lpR fFf">


    <q-page-container>
      <router-view />
    </q-page-container>
    <q-footer elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense text-color="accent" icon="home" to="/" />
        <q-space />
        <q-btn dense text-color="accent" icon="insert_chart" to="/statistics" />
        <q-space />
        <q-btn dense text-color="accent" icon="settings" to="/settings" />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

