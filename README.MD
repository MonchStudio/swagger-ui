# Swagger UI 一款增强型UI
## 简介
swagger-ui项目，基于https://gitee.com/xiaoym/knife4j 项目中的ui模块分离微改而来。
非常感谢对https://gitee.com/xiaoym/knife4j项目做出贡献的伙伴。

swagger-ui项目分离出来的原因是喜欢他的ui和ui功能增强。但是暂时用不到其他模块，如果你对他的其他模块感兴趣请移步https://gitee.com/xiaoym/knife4j 。

## 使用方法
项目pom.xml中引入
````xml
<dependency>
  <groupId>com.monchstudio.swagger</groupId>
  <artifactId>swagger-ui</artifactId>
  <version>2.1.2</version>
</dependency>
````
注意该项目需要配合springfox接口部分项目使用，所以需要引入以下依赖：
```xml
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger2</artifactId>
    <version>2.10.5</version>
</dependency>
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-spring-webmvc</artifactId>
    <version>2.10.5</version>
</dependency>
```

> 注意：本项目目前仅测试通过2.10.5版本的springfox，其他版本请自行测试。