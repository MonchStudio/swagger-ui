<!--/*
* Copyright 2019-2020 the original author or authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      https://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/-->
<template>
  <div class="globalFooter">
    <div v-if="$slots.copyright" class="copyright">
      <slot name="copyright" />
    </div>
    <div v-else class="copyright"> Copyright
      <a-icon type="copyright" /> <span v-text="nowYear"></span></div>
  </div>
</template>
<script>
export default {
  name: "GlobalFooter",
  props: {
    links: {
      type: Array,
      default: () => {
        [];
      }
    }
  },
  data() {
    return {
      nowYear:new Date().getFullYear()
    };
  }
};
</script>

<style lang="less" scoped>
@import "./index.less";
</style>

