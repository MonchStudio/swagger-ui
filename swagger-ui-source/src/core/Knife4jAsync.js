/***
 * swagger-bootstrap-ui v1.9.7 / 2019-11-11 16:10:52
 *
 *
 * Gitee:https://gitee.com/xiaoym/knife4j
 * GitHub:https://github.com/xiaoymin/swagger-bootstrap-ui
 * QQ:621154782
 *
 * Swagger enhanced UI component package
 *
 * Author: xiaoyumin
 * email:xiaoymin@foxmail.com
 * Copyright: 2017 - 2019, xiaoyumin, https://doc.xiaominfo.com/
 *
 * Licensed under Apache License 2.0
 * https://github.com/xiaoymin/swagger-bootstrap-ui/blob/master/LICENSE
 *
 * v1.7.5
 * create by xiaoymin on 2018-7-4 15:32:07
 *
 * 重构swagger-bootstrap-ui组件,为以后动态扩展更高效,扩展接口打下基础
 *
 * v2.0.0
 * modified by xiaoymin on 2019-11-11 16:42:43
 *
 * v2.0.5
 * 剥离解析OpenAPI规范的逻辑,只解析基础部分,提供页面渲染速度,dev分支
 *
 * 基于Vue + Ant Design Vue重构Ui组件
 *
 */
import {
  message
} from 'ant-design-vue'
import md5 from 'js-md5'
import {
  urlToList
} from '@/components/utils/pathTools'
import KUtils from './utils'
import marked from 'marked'
import async from 'async'
import {
  findComponentsByPath,
  findMenuByKey
} from '@/components/utils/Knife4jUtils'
import Constants from '@/store/constants'
import uniqueId from 'lodash/uniqueId'
import isObject from 'lodash/isObject'
import has from 'lodash/has'
import keys from 'lodash/keys'
import unset from 'lodash/unset'
import isNull from 'lodash/isNull'
import isUndefined from 'lodash/isUndefined'
import xml2js from 'xml2js'
import DebugAxios from 'axios'

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
})

function SwaggerBootstrapUi(options) {
  this.swaggerData=null;
  //swagger请求api地址
  this.url = options.url || 'swagger-resources'
  this.i18n=options.i18n||'zh-CN'
  this.i18nInstance = null
  this.configUrl = options.configUrl || 'swagger-resources/configuration/ui'
  //用于控制是否请求configUrl的配置
  this.configSupport = options.configSupport || false;
  //用于控制是否请求configSecurityUrl的配置
  this.securitySupport = options.securitySupport || false;
  //去除Vue实例的对象引用,该处可能存在循环依赖的问题,造成JS内存过高
  //this.$Vue = options.Vue
  //增加一些属性用来代替VUE对象实例
  this.serviceOptions=null;
  this.defaultServiceOption=null;
  this.routeParams=options.routeParams||null;
  this.menuData=null;
  this.store=options.store||{};
  this.localStore=options.localStore||{};
  //
  this.plus = options.plus
  //文档id
  this.docId = 'content'
  this.title = 'ui'
  this.titleOfUrl = 'https://gitee.com/xiaoym/knife4j'
  this.load = 1
  //tabid
  this.tabId = 'tabUl'
  this.tabContentId = 'tabContent'
  this.searchEleId = 'spanSearch'
  this.searchTxtEleId = 'searchTxt'
  this.menuId = 'menu'
  this.searchMenuId = 'searchMenu'
  //实例分组
  this.instances = []
  //当前分组实例
  this.currentInstance = null
  //全局菜单 add by xiaoymin at 2019-11-30 13:51:39
  //菜单初始化时添加,后期tab切换时用来查找
  this.globalMenuDatas = []
  //动态tab
  this.globalTabId = 'sbu-dynamic-tab'
  this.globalTabs = []
  this.layui = options.layui
  this.ace = options.ace
  this.treetable = options.treetable
  this.layTabFilter = 'admin-pagetabs'
  this.version = '1.9.6'
  this.requestOrigion = 'SwaggerBootstrapUi'
  this.requestParameter = {} //浏览器请求参数
  //个性化配置
  this.settings = options.settings|| {
    showApiUrl: false, //接口api地址不显示
    showTagStatus: false, //分组tag显示description属性,针对@Api注解没有tags属性值的情况
    enableSwaggerBootstrapUi: false, //是否开启swaggerBootstrapUi增强
    treeExplain: true,
    enableFilterMultipartApis: false, //针对RequestMapping的接口请求类型,在不指定参数类型的情况下,如果不过滤,默认会显示7个类型的接口地址参数,如果开启此配置,默认展示一个Post类型的接口地址
    enableFilterMultipartApiMethodType: 'POST', //默认保存类型
    enableRequestCache: true, //是否开启请求参数缓存
    enableCacheOpenApiTable: false, //是否开启缓存已打开的api文档
    language: 'zh' //默认语言版本
  }
  //SwaggerBootstrapUi增强注解地址
  this.extUrl = '/v2/api-docs-ext'
  this.ext3Url='/v3/api-docs-ext'
  //验证增强有效地址
  this.validateExtUrl = ''
  //缓存api对象,以区分是否是新的api,存储SwaggerBootstapUiCacheApi对象
  this.cacheApis = options.cacheApis|| []
  this.hasLoad = false
  //add i18n supports by xiaoymin at 2019-4-17 20:27:34
  //this.i18n = new I18n();
  this.i18nInstance=options.i18nInstance||{}
  //配置属性 2019-8-28 13:19:35,目前仅支持属性supportedSubmitMethods
  this.configuration = {
    supportedSubmitMethods: [
      'get',
      'put',
      'post',
      'delete',
      'options',
      'head',
      'patch',
      'trace'
    ]
  }
}
/***
 * swagger-bootstrap-ui的main方法,初始化文档所有功能,类似于SpringBoot的main方法
 */
SwaggerBootstrapUi.prototype.main = function () {
  var that = this
  //that.welcome();
  that.initRequestParameters()
  that.initSettings();
  /* that.initUnTemplatePageI18n();
  that.initWindowWidthAndHeight();
  that.initApis();
  that.windowResize(); */
  //2019/08/28 13:16:50 支持configuration接口,主要是相关配置,目前支持属性supportedSubmitMethods(请求调试)
  //接口地址:/swagger-resources/configuration/ui
}

/***
 * 初始化请求参数
 * 开启请求参数缓存：cache=1
 * 菜单Api地址显示: showMenuApi=1
 * 分组tag显示dsecription说明属性: showDes=1
 * 开启RequestMapping接口过滤,默认只显示: filterApi=1  filterApiType=post
 * 开启缓存已打开的api文档:cacheApi=1
 * 启用SwaggerBootstrapUi提供的增强功能:plus=1
 * i18n支持：lang=zh|en
 */
SwaggerBootstrapUi.prototype.initRequestParameters = function () {
  var that = this
  var params = window.location.search
  if (params != undefined && params != '') {
    var notQus = params.substr(1)
    if (notQus != undefined && notQus != null && notQus != '') {
      var pms = notQus.split('&')
      for (var i = 0; i < pms.length; i++) {
        var pm = pms[i]
        if (pm != undefined && pm != null && pm != '') {
          var pmArr = pm.split('=')
          that.requestParameter[KUtils.trim(pmArr[0])] = KUtils.trim(pmArr[1])
        }
      }
    }
  }
  that.log('请求参数========================================')
  that.log(that.requestParameter)
}

/***
 * 读取个性化配置信息
 * modified by xiaoymin at 2019-11-30 20:49:59
 * 个性化配置功能在v1.9.7版本中更新,去掉原来一些复杂无用的配置,通过单页面Settings.vue单组件来对个性化配置进行操作
 * 此处仅作为一个读取初始化的作用
 */
SwaggerBootstrapUi.prototype.initSettings = function () {
  var that = this
  that.log("本地Settings初始化")
  //添加对knife4j-front版本的支持,静态版本不提供配置
  if (that.configSupport) {
    that.configInit()
  }
  //加载分组接口
  that.analysisGroup();
}

SwaggerBootstrapUi.prototype.initApis = function () {
  var that = this
  if (window.localStorage) {
    var store = window.localStorage
    var cacheApis = store['SwaggerBootstrapUiCacheApis']
    if (cacheApis != undefined && cacheApis != null && cacheApis != '') {
      //var settings = JSON.parse(cacheApis)
      var settings = KUtils.json5parse(cacheApis)
      that.cacheApis = settings
    } else {
      that.cacheApis = []
    }
  }
}

/**
 * Swagger配置信息加载
 */
SwaggerBootstrapUi.prototype.configInit = function () {
  var that = this
  this.ajax({
    url: that.configUrl,
    type: 'get',
    timeout: 20000,
    dataType: 'json'
  },data=>{
    if (
      data != null &&
      data != undefined &&
      data.hasOwnProperty('supportedSubmitMethods')
    ) {
      var originalSupportSubmitMethods = data['supportedSubmitMethods']
      if (originalSupportSubmitMethods.length > 0) {
        var newSupports = []
        originalSupportSubmitMethods.forEach(function (method) {
          newSupports.push(method.toLowerCase())
        })
        that.configuration.supportedSubmitMethods = newSupports
      } else {
        that.configuration.supportedSubmitMethods = []
      }
    }
  },err=>{
    //message.error('Knife4j文档请求异常')
    //隐藏config的请求接口错误显示
    that.error(err);
  })
  /* that.$Vue
    .$axios({
      url: that.configUrl,
      type: 'get',
      timeout: 20000,
      dataType: 'json'
    })
    .then(function (data) {
      if (
        data != null &&
        data != undefined &&
        data.hasOwnProperty('supportedSubmitMethods')
      ) {
        var originalSupportSubmitMethods = data['supportedSubmitMethods']
        if (originalSupportSubmitMethods.length > 0) {
          var newSupports = []
          originalSupportSubmitMethods.forEach(function (method) {
            newSupports.push(method.toLowerCase())
          })
          that.configuration.supportedSubmitMethods = newSupports
        } else {
          that.configuration.supportedSubmitMethods = []
        }
      }
    }).catch(function (err) {
      //message.error('Knife4j文档请求异常')
      //隐藏config的请求接口错误显示
      that.error(err);
    }) */
}

/***
 * 调用swagger的分组接口,获取swagger分组信息,包括分组名称,接口url地址,版本号等
 */
SwaggerBootstrapUi.prototype.analysisGroup = function () {
  var that = this
  try {
    that.ajax({
      url: that.url,
      type: 'get',
      timeout: 20000,
      dataType: 'json'
    },data=>{
      that.analysisGroupSuccess(data)
        //创建分组元素
        that.createGroupElement()
    },err=>{
      message.error('文档请求异常')
        that.error(err)
    })
  } catch (err) {
    that.error(err)
  }
}

/***
 * 请求分组成功处理逻辑
 * @param data
 */
SwaggerBootstrapUi.prototype.analysisGroupSuccess = function (data) {
  var that = this
  that.log('done---------------------------')
  that.log(data)
  that.log('请求成功')
  that.log(data)
  var t = typeof data
  var groupData = null
  if (t == 'string') {
    //groupData = JSON.parse(data)
    groupData = KUtils.json5parse(data)
  } else {
    groupData = data
  }
  that.log('响应分组json数据')
  that.log(groupData)
  var serviceOptions = [];
  groupData.forEach(function (group) {
    var g = new SwaggerBootstrapUiInstance(
      KUtils.toString(group.name,'').replace(/\//g,'-'),
      group.location,
      group.swaggerVersion
    )
    g.url = group.url
    var newUrl = ''
    //此处需要判断basePath路径的情况
    if (group.url != null && group.url != undefined && group.url != '') {
      newUrl = group.url
    } else {
      newUrl = group.location
    }
    var extBasePath = ''
    var idx = newUrl.indexOf('/v2/api-docs')
    var idx3 =newUrl.indexOf('/v3/api-docs');
    if (idx >= 0 || idx3>=0) {
      //增强地址存在basePath
      extBasePath = newUrl.substr(0, idx)
    }
    that.log('增强basePath地址：' + extBasePath)
    //赋值增强地址
    if(g.oas2()){
      g.extUrl = extBasePath + that.extUrl + '?group=' + group.name
    }else{
      g.extUrl = extBasePath + that.ext3Url + '?group=' + group.name
    }

    if (that.validateExtUrl == '') {
      that.validateExtUrl = g.extUrl
    }
    //判断当前分组url是否存在basePath
    if (
      group.basePath != null &&
      group.basePath != undefined &&
      group.basePath != ''
    ) {
      g.baseUrl = group.basePath
    }
    //赋值查找缓存的id
    if (that.cacheApis.length > 0) {
      var cainstance = null
      that.cacheApis.forEach(ca => {
        if (ca.id == g.groupId) {
          cainstance = ca
        }
      })
      /*  $.each(that.cacheApis, function (x, ca) {
         if (ca.id == g.groupId) {
           cainstance = ca
         }
       }) */
      if (cainstance != null) {
        g.firstLoad = false
        //判断旧版本是否包含updatesApi属性
        if (!cainstance.hasOwnProperty('updateApis')) {
          cainstance['updateApis'] = {}
        }
        g.cacheInstance = cainstance
        that.log(g)
        //g.groupApis=cainstance.cacheApis;
      } else {
        g.cacheInstance = new SwaggerBootstrapUiCacheApis({
          id: g.groupId,
          name: g.name
        })
      }
    } else {
      g.cacheInstance = new SwaggerBootstrapUiCacheApis({
        id: g.groupId,
        name: g.name
      })
    }
    //双向绑定
    serviceOptions.push({
      label: g.name,
      value: g.id
    })
    that.instances.push(g)
  })
  this.serviceOptions=serviceOptions;
  this.store.dispatch('globals/setServiceOptions', serviceOptions);
  //that.$Vue.serviceOptions = serviceOptions;
  if (serviceOptions.length > 0) {
    //that.$Vue.defaultServiceOption = serviceOptions[0].value;
    this.defaultServiceOption=serviceOptions[0].value;
    this.store.dispatch('globals/setDefaultService', serviceOptions[0].value);
  }

}

/***
 * 创建swagger分组页面元素
 */
SwaggerBootstrapUi.prototype.createGroupElement = function () {
  var that = this;
  //创建分组flag
  that.log("分组-------------------------------")
  //that.log(that.instances)
  //that.log(that.$Vue.$route.params)
  //此处需要根据当前访问hash地址动态设置访问的下拉组
  //待写,是否包含分组名称
  var urlParams = this.routeParams;
  if (KUtils.checkUndefined(urlParams)) {
    if (urlParams.hasOwnProperty('groupName')) {
      //是否不为空
      var gpName = urlParams.groupName;
      if (KUtils.checkUndefined(gpName) && gpName != '') {
        let selectInstance = that.selectInstanceByGroupName(gpName);
        that.log("包含分组名称")
        that.log(selectInstance)
        //双向绑定下拉框的服务选项
        //that.$Vue.defaultServiceOption = selectInstance.id;
        this.defaultServiceOption=selectInstance.id;
        this.store.dispatch('globals/setDefaultService', selectInstance.id);
        that.analysisApi(selectInstance);
      } else {
        //默认加载第一个url
        that.analysisApi(that.instances[0]);
      }
    } else {
      //默认加载第一个url
      that.analysisApi(that.instances[0]);
    }
  } else {
    //默认加载第一个url
    that.analysisApi(that.instances[0]);
  }

}

/***
 * 获取当前分组实例
 * @param name
 * @returns {*}
 */
SwaggerBootstrapUi.prototype.selectInstanceByGroupName = function (name) {
  var that = this;
  var instance = null;
  that.instances.forEach(function (group) {
    //})
    //$.each(that.instances,function (i, group) {
    if (group.name == name) {
      instance = group;
      return;
    }
  })
  return instance;
}

/***
 * 加载swagger的分组详情接口
 * @param instance 分组接口请求实例
 */
SwaggerBootstrapUi.prototype.analysisApi = function (instance) {
  var that = this;
  try {
    //赋值
    that.currentInstance = instance;
    if (!that.currentInstance.load) {
      var api = instance.url;
      if (api == undefined || api == null || api == "") {
        api = instance.location;
      }
      //判断是否开启增强功能
      if (that.settings.enableSwaggerBootstrapUi) {
        api = instance.extUrl;
      }
      //这里判断url请求是否已加载过
      //防止出现根路径的情况
      var idx = api.indexOf('/');
      if (idx == 0) {
        api = api.substr(1);
      }
      //测试
      //api = 'run.json';
      that.ajax({
        url: api,
        dataType: 'json',
        timeout: 20000,
        type: 'get'
      },data=>{
        that.analysisApiSuccess(data);
      },err=>{
        message.error('文档请求异常')
        that.error(err);
      })
     /*  DebugAxios.create().request({
        url: api,
        dataType: 'json',
        timeout: 20000,
        type: 'get'
      }).then(function (data) {
        that.analysisApiSuccess(data);
      }).catch(function (err) {
        message.error('Knife4j文档请求异常')
        that.error(err);
      }) */
    } else {
      //that.setInstanceBasicPorperties(null);
      //更新当前缓存security
      //that.updateCurrentInstanceSecuritys();
      that.createDescriptionElement();
      that.createDetailMenu(false);
      that.afterApiInitSuccess();
      this.store.dispatch('globals/setSwaggerInstance', this.currentInstance);
    }
  } catch (err) {
    that.error(err);
    if (window.console) {
      console.error(err);
    }
  }
}

/**
 * 当swagger-api请求初始化完成后,初始化页面的相关操作
 * 包括搜索、打开地址hash地址、tab事件等等
 */
SwaggerBootstrapUi.prototype.afterApiInitSuccess = function () {
  var that = this;
  //搜索
  //that.searchEvents();
  //tab事件,新版本无此属性
  //that.tabCloseEventsInit();
  //opentab
  that.initOpenTable();
  //hash
  //that.hashInitEvent();
  //init hashMethod
  //地址栏打开api地址
  //新版本默认已实现
  //that.initCurrentHashApi();
}

/***
 * 已经打开的api缓存,下一次刷新时打开
 * 新版本需要通过tabs实现
 */
SwaggerBootstrapUi.prototype.initOpenTable = function () {
  var that = this;
  if (!that.settings.enableCacheOpenApiTable) {
    return
  }
  if (window.localStorage) {
    var store = window.localStorage;
    var cacheApis = store["SwaggerBootstrapUiCacheOpenApiTableApis"] || "{}";
    //var settings = JSON.parse(cacheApis);
    var settings = KUtils.json5parse(cacheApis);
    var insid = that.currentInstance.groupId;
    var cacheApis = settings[insid] || [];

    if (cacheApis.length > 0) {
      for (var i = 0; i < cacheApis.length; i++) {
        var cacheApi = cacheApis[i];
        that.log(cacheApi)
        //var xx=that.getMenu().find(".menuLi[lay-id='"+cacheApi.tabId+"']");
        //xx.trigger("click");
      }
    }
  }
}

/**
 * 接口请求api成功时的操作
 */
SwaggerBootstrapUi.prototype.analysisApiSuccess = function (data) {
  var that = this;
  that.hasLoad = true;
  that.log(data);
  //console.log(data);
  var t = typeof (data);
  var menu = null;
  if (t == 'string') {
    //menu = JSON.parse(data);
    menu = KUtils.json5parse(data);
  } else {
    menu = data;
  }
  that.setInstanceBasicPorperties(menu);
  that.analysisDefinition(menu);
  //DApiUI.definitions(menu);
  that.log(menu);
  that.createDescriptionElement();
  //当前实例已加载
  that.currentInstance.load = true;
  //创建swaggerbootstrapui主菜单
  that.createDetailMenu(true);
  //opentab
  //that.initOpenTable();
  //that.afterApiInitSuccess();
  this.store.dispatch('globals/setSwaggerInstance', this.currentInstance);

}

/***
 * 更新当前实例的security对象
 */
SwaggerBootstrapUi.prototype.updateCurrentInstanceSecuritys = function () {
  var that = this;
  if (that.currentInstance.securityArrs != null && that.currentInstance.securityArrs.length > 0) {
    //判断是否有缓存cache值
    //var cacheSecurityData=$("#sbu-header").data("cacheSecurity");
    var cacheSecurityData = that.getSecurityStores();
    if (cacheSecurityData != null && cacheSecurityData != undefined) {
      cacheSecurityData.forEach(function (ca) {
        //})
        //$.each(cacheSecurityData,function (i, ca) {
        that.currentInstance.securityArrs.forEach(function (sa) {
          //})
          //$.each(that.currentInstance.securityArrs,function (j, sa) {
          if (ca.key == sa.key && ca.name == sa.name) {
            sa.value = ca.value;
          }
        })
      })

    }
  }
}

/***
 * 从localStorage对象中获取
 */
SwaggerBootstrapUi.prototype.getSecurityStores = function () {
  var csys = null;
  if (window.localStorage) {
    var store = window.localStorage;
    var cacheSecuritys = store["SwaggerBootstrapUiCacheSecuritys"];
    if (cacheSecuritys != undefined && cacheSecuritys != null && cacheSecuritys != "") {
      //var settings = JSON.parse(cacheApis);
      var settings = KUtils.json5parse(cacheApis);
      csys = settings;
    }
  }
  return csys;
}

/***
 * 基础实例赋值
 * @param menu
 */
SwaggerBootstrapUi.prototype.setInstanceBasicPorperties = function (menu) {
  if(this.currentInstance.oas2()){
    this.basicInfoOAS2(menu);
  }else{
    this.basicInfoOAS3(menu);
  }

}

/**
 * 解析OAS2.0的基础配置信息
 * @param {*} menu
 */
SwaggerBootstrapUi.prototype.basicInfoOAS2=function(menu){
  var that = this;
  var title = '',
    description = '',
    name = '',
    version = '',
    termsOfService = '';
  var host = KUtils.getValue(menu, "host", "", true);
  that.currentInstance.host = host;
  if (menu != null && menu != undefined) {
    if (menu.hasOwnProperty("info")) {
      var info = menu.info;
      title = KUtils.getValue(info, "title", '', true);
      description = KUtils.getValue(info, "description", "", true);
      if (info.hasOwnProperty("contact")) {
        var contact = info["contact"];
        name = KUtils.getValue(contact, "name", "", true);
      }
      version = KUtils.getValue(info, "version", "", true);
      termsOfService = KUtils.getValue(info, "termsOfService", "", true);
    }
    //that.currentInstance.host = host;
    that.currentInstance.title = title;
    //impl markdown syntax
    that.currentInstance.description = marked(description);
    that.currentInstance.contact = name;
    that.currentInstance.version = version;
    that.currentInstance.termsOfService = termsOfService;
    //that.currentInstance.basePath = menu["basePath"];
    that.currentInstance.basePath = KUtils.getValue(menu,'basePath','/',true);;
  } else {
    title = that.currentInstance.title;
  }
}
/**
 * 解析OAS3.0的基础配置
 * @param {*} menu
 */
SwaggerBootstrapUi.prototype.basicInfoOAS3=function(menu){
  var that = this;
  var title = '',
    description = '',
    name = '',
    version = '',
    termsOfService = '';
  var host = KUtils.getValue(menu, "host", "", true);
  if(KUtils.checkUndefined(menu)){
    if(menu.hasOwnProperty("servers")&&KUtils.checkUndefined(menu["servers"])){
      var servers=menu["servers"];
      if(KUtils.arrNotEmpty(servers)){
        host=servers[0]["url"];
      }
    }
    that.currentInstance.host = host;
    if(menu.hasOwnProperty("info")&&KUtils.checkUndefined(menu["info"])){
      var info = menu.info;
      title = KUtils.getValue(info, "title", '', true);
      description = KUtils.getValue(info, "description", "", true);
      if (info.hasOwnProperty("contact")) {
        var contact = info["contact"];
        name = KUtils.getValue(contact, "name", "", true);
      }
      version = KUtils.getValue(info, "version", "", true);
      termsOfService = KUtils.getValue(info, "termsOfService", "", true);

      that.currentInstance.title = title;
      //impl markdown syntax
      that.currentInstance.description = marked(description);
      that.currentInstance.contact = name;
      that.currentInstance.version = version;
      that.currentInstance.termsOfService = termsOfService;
      //that.currentInstance.basePath = menu["basePath"];
      that.currentInstance.basePath = KUtils.getValue(menu,'basePath','/',true);
    }else{
      title = that.currentInstance.title;
    }
  }
}

/**
 * 递归查询additionalProperties中的类型，针对Map类型会存在一直递归下去的情况，程序中则一直递归查询到包含属性additionalProperties的情况，直到找到类则跳出
 * @param {*} addtionalObject
 * @param {*} oas 是否v2
 */
SwaggerBootstrapUi.prototype.deepAdditionalProperties=function(addtionalObject,oas){
  var definiationName='';
  //console.log(addtionalObject)
  if(KUtils.checkUndefined(addtionalObject)){
    if(addtionalObject.hasOwnProperty('additionalProperties')){
      var dpAddtional=addtionalObject['additionalProperties'];
      return this.deepAdditionalProperties(dpAddtional,oas);
    }else{
      //不存在了，
      if (addtionalObject.hasOwnProperty('$ref')) {
        var adref = addtionalObject['$ref'];
        var regex = new RegExp(KUtils.oasmodel(oas), 'ig');
        if (regex.test(adref)) {
          definiationName = RegExp.$1;
        }
      }else if(addtionalObject.hasOwnProperty('items')){
        var addItem=addtionalObject['items'];
        if(addItem.hasOwnProperty('$ref')){
          var adrefItem = addItem['$ref'];
          var regexItem = new RegExp(KUtils.oasmodel(oas), 'ig');
          if (regexItem.test(adrefItem)) {
            definiationName = RegExp.$1;
          }
        }
      }
    }
  }
  return definiationName;

}
/**
 * 异步解析类
 * @param {*} menu
 * @param {*} swud
 * @param {*} oas2 是否v2版本
 */
SwaggerBootstrapUi.prototype.analysisDefinitionAsync=function(menu,swud,oas2){
  if(oas2){
    this.analysisDefinitionAsyncOAS2(menu,swud,oas2);
  }else{
    this.analysisDefinitionAsyncOAS3(menu,swud,oas2);
  }
}
/**
 * 异步解析v2版本的model
 * @param {*} menu
 * @param {*} swud
 * @param {*} oas2
 */
SwaggerBootstrapUi.prototype.analysisDefinitionAsyncOAS2=function(menu,swud,oas2){
  var that=this;
  var modelName=swud.name;
  //解析definition
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("definitions")) {
    var definitions = menu["definitions"];
    //改用async的for循环
    for (var name in definitions) {
      if(name==modelName){
        /* swud = new SwaggerBootstrapUiDefinition();
        swud.name = name;
        swud.ignoreFilterName = name; */
        //that.log("开始解析Definition:"+name);
        //获取value
        var value = definitions[name];
        if (KUtils.checkUndefined(value)) {
          swud.description = KUtils.propValue("description", value, "");
          swud.type = KUtils.propValue("type", value, "");
          swud.title = KUtils.propValue("title", value, "");
          //判断是否有required属性
          if (value.hasOwnProperty("required")) {
            swud.required = value["required"];
          }
          //是否有properties
          if (value.hasOwnProperty("properties")) {
            var properties = value["properties"];
            var defiTypeValue = {};
            for (var property in properties) {
              var propobj = properties[property];
              //判断是否包含readOnly属性
              if (!propobj.hasOwnProperty("readOnly") || !propobj["readOnly"]) {}
              var spropObj = new SwaggerBootstrapUiProperty();
              //赋值readOnly属性
              if (propobj.hasOwnProperty("readOnly")) {
                spropObj.readOnly = propobj["readOnly"];
              }
              spropObj.name = property;
              spropObj.originProperty = propobj;
              spropObj.type = KUtils.propValue("type", propobj, "string");
              spropObj.description = KUtils.propValue("description", propobj, "");
              //判断是否包含枚举
              if (propobj.hasOwnProperty("enum")) {
                spropObj.enum = propobj["enum"];
                if (spropObj.description != "") {
                  spropObj.description += ",";
                }
                spropObj.description = spropObj.description + "可用值:" + spropObj.enum.join(",");
              }
              if (spropObj.type == "string") {
                spropObj.example = String(KUtils.propValue("example", propobj, ""));
              } else {
                spropObj.example = KUtils.propValue("example", propobj, "");
              }

              spropObj.format = KUtils.propValue("format", propobj, "");
              spropObj.required = KUtils.propValue("required", propobj, false);
              if (swud.required.length > 0) {
                //有required属性,需要再判断一次
                if (swud.required.indexOf(spropObj.name) > -1) {
                  //if($.inArray(spropObj.name,swud.required)>-1){
                  //存在
                  spropObj.required = true;
                }
              }
              //默认string类型
              var propValue = "";
              //判断是否有类型
              if (propobj.hasOwnProperty("type")) {
                var type = propobj["type"];
                //判断是否有example
                if (propobj.hasOwnProperty("example")) {
                  if (type == "string") {
                    propValue = String(KUtils.propValue("example", propobj, ""));
                  } else {
                    propValue = propobj["example"];
                  }
                } else if (KUtils.checkIsBasicType(type)) {
                  propValue = KUtils.getBasicTypeValue(type);
                  //此处如果是object情况,需要判断additionalProperties属性的情况
                  if (type == "object") {
                    if (propobj.hasOwnProperty("additionalProperties")) {
                      var addpties = propobj["additionalProperties"];
                      that.log("------解析map-=-----------additionalProperties,defName:" + name);
                      //判断是否additionalProperties中还包含additionalProperties属性
                      var addtionalName=this.deepAdditionalProperties(addpties,oas2);
                      //console.log("递归类型---"+addtionalName)
                      //判断是否有ref属性,如果有,存在引用类,否则默认是{}object的情况
                      if(KUtils.strNotBlank(addtionalName)){
                        //console.log("-------------------------addtionalName--------"+addtionalName)
                        //这里需要递归判断是否是本身,如果是,则退出递归查找
                        var globalArr = new Array();
                        //添加类本身
                        globalArr.push(name);
                        var addTempValue = null;
                        if (addtionalName != name) {
                          addTempValue = that.findRefDefinition(addtionalName, definitions, false, globalArr);
                        } else {
                          addTempValue = that.findRefDefinition(addtionalName, definitions, true, name, globalArr);
                        }
                        propValue = {
                          "additionalProperties1": addTempValue
                        }
                        //console.log(propValue)
                        spropObj.type = addtionalName;
                        spropObj.refType = addtionalName;
                      }
                      else if (addpties.hasOwnProperty("$ref")) {
                        var adref = addpties["$ref"];
                        var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                        if (regex.test(adref)) {
                          var addrefType = RegExp.$1;
                          var addTempValue = null;
                          //这里需要递归判断是否是本身,如果是,则退出递归查找
                          var globalArr = new Array();
                          //添加类本身
                          globalArr.push(name);

                          if (addrefType != name) {
                            addTempValue = that.findRefDefinition(addrefType, definitions, false, globalArr,null,oas2);
                          } else {
                            addTempValue = that.findRefDefinition(addrefType, definitions, true, globalArr,name,oas2);
                          }
                          propValue = {
                            "additionalProperties1": addTempValue
                          }
                          that.log("解析map-=完毕：")
                          that.log(propValue);
                          spropObj.type = addrefType;
                          spropObj.refType = addrefType;
                        }
                      } else if (addpties.hasOwnProperty("items")) {
                        //数组
                        var addPropItems = addpties["items"];

                        var adref = addPropItems["$ref"];
                        var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                        if (regex.test(adref)) {
                          var addrefType = RegExp.$1;
                          var addTempValue = null;
                          //这里需要递归判断是否是本身,如果是,则退出递归查找
                          var globalArr = new Array();
                          //添加类本身
                          globalArr.push(name);

                          if (addrefType != name) {
                            addTempValue = that.findRefDefinition(addrefType, definitions, false, globalArr,null,oas2);
                          } else {
                            addTempValue = that.findRefDefinition(addrefType, definitions, true, globalArr,name,oas2);
                          }
                          var tempAddValue = new Array();
                          tempAddValue.push(addTempValue);
                          propValue = {
                            "additionalProperties1": tempAddValue
                          }
                          that.log("解析map-=完毕：")
                          that.log(propValue);
                          spropObj.type = "array";
                          spropObj.refType = addrefType;
                        }
                      }
                    }
                  }
                } else {
                  if (type == "array") {
                    propValue = new Array();
                    var items = propobj["items"];
                    var ref = items["$ref"];
                    //此处有可能items是array
                    if (items.hasOwnProperty("type")) {
                      if (items["type"] == "array") {
                        ref = items["items"]["$ref"];
                      }
                    }
                    //判断是否存在枚举
                    if (items.hasOwnProperty("enum")) {
                      if (spropObj.description != "") {
                        spropObj.description += ",";
                      }
                      spropObj.description = spropObj.description + "可用值:" + items["enum"].join(",");
                    }
                    var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                    if (regex.test(ref)) {
                      var refType = RegExp.$1;
                      spropObj.refType = refType;
                      //这里需要递归判断是否是本身,如果是,则退出递归查找
                      var globalArr = new Array();
                      //添加类本身
                      globalArr.push(name);
                      if (refType != name) {
                        propValue.push(that.findRefDefinition(refType, definitions, false, globalArr,null,oas2));
                      } else {
                        propValue.push(that.findRefDefinition(refType, definitions, true, globalArr,name,oas2));
                      }
                    } else {
                      //schema基础类型显示
                      spropObj.refType = items["type"];
                    }
                  }
                }

              } else {
                //that.log("解析属性："+property);
                //that.log(propobj);
                if (propobj.hasOwnProperty("$ref")) {
                  var ref = propobj["$ref"];
                  var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                  if (regex.test(ref)) {
                    var refType = RegExp.$1;
                    spropObj.refType = refType;
                    //这里需要递归判断是否是本身,如果是,则退出递归查找
                    var globalArr = new Array();
                    //添加类本身
                    globalArr.push(name);
                    if (refType != name) {
                      propValue = that.findRefDefinition(refType, definitions, false, globalArr,null,oas2);
                    } else {
                      propValue = that.findRefDefinition(refType, definitions, true, globalArr,null,oas2);
                    }

                  }
                } else {
                  propValue = {};
                }
              }
              spropObj.value = propValue;
              //判断是否有format,如果是integer,判断是64位还是32位
              if (spropObj.format != null && spropObj.format != undefined && spropObj.format != "") {
                //spropObj.type=spropObj.format;
                spropObj.type += "(" + spropObj.format + ")";
              }
              //判断最终类型
              if (spropObj.refType != null && spropObj.refType != "") {
                //判断基础类型,非数字类型
                if (spropObj.type == "string") {
                  spropObj.type = spropObj.refType;
                }
              }
              //addprop
              //这里判断去重
              if (!that.checkPropertiesExists(swud.properties, spropObj)) {
                swud.properties.push(spropObj);
                //如果当前属性readOnly=true，则实体类value排除此属性的值
                if (!spropObj.readOnly) {
                  defiTypeValue[property] = propValue;
                }
              }
            }
            swud.value = defiTypeValue;
          }
        }
        ////console("开始递归---------------deepTreeTableRefParameter")
        deepTreeTableRefParameter(swud, that, swud, swud,oas2);
        ////console(swud)
        //that.currentInstance.difArrs.push(swud);
        swud.init=true;
        break;
      }
    }
  }
}

/**
 * 异步解析v3版本的model
 * @param {*} menu
 * @param {*} swud
 * @param {*} oas2
 */
SwaggerBootstrapUi.prototype.analysisDefinitionAsyncOAS3=function(menu,swud,oas2){
  var that=this;
  var modelName=swud.name;
  var definitions={};
  if (KUtils.checkUndefined(menu)&& menu.hasOwnProperty("components")) {
    var components=menu["components"];
    if(KUtils.checkUndefined(components)&&components.hasOwnProperty("schemas")){
      var def=components["schemas"];
      if(KUtils.checkUndefined(def)){
        definitions=def;
      }
    }
  }
  //解析definition
  if (KUtils.checkUndefined(definitions)) {
    //改用async的for循环
    for (var name in definitions) {
      if(name==modelName){
        /* swud = new SwaggerBootstrapUiDefinition();
        swud.name = name;
        swud.ignoreFilterName = name; */
        //that.log("开始解析Definition:"+name);
        //获取value
        var value = definitions[name];
        if (KUtils.checkUndefined(value)) {
          swud.description = KUtils.propValue("description", value, "");
          swud.type = KUtils.propValue("type", value, "");
          swud.title = KUtils.propValue("title", value, "");
          //判断是否有required属性
          if (value.hasOwnProperty("required")) {
            swud.required = value["required"];
          }
          //是否有properties
          if (value.hasOwnProperty("properties")) {
            var properties = value["properties"];
            var defiTypeValue = {};
            for (var property in properties) {
              var propobj = properties[property];
              //判断是否包含readOnly属性
              if (!propobj.hasOwnProperty("readOnly") || !propobj["readOnly"]) {}
              var spropObj = new SwaggerBootstrapUiProperty();
              //赋值readOnly属性
              if (propobj.hasOwnProperty("readOnly")) {
                spropObj.readOnly = propobj["readOnly"];
              }
              spropObj.name = property;
              spropObj.originProperty = propobj;
              spropObj.type = KUtils.propValue("type", propobj, "string");
              spropObj.description = KUtils.propValue("description", propobj, "");
              //判断是否包含枚举
              if (propobj.hasOwnProperty("enum")) {
                spropObj.enum = propobj["enum"];
                if (spropObj.description != "") {
                  spropObj.description += ",";
                }
                spropObj.description = spropObj.description + "可用值:" + spropObj.enum.join(",");
              }
              if (spropObj.type == "string") {
                spropObj.example = String(KUtils.propValue("example", propobj, ""));
              } else {
                spropObj.example = KUtils.propValue("example", propobj, "");
              }

              spropObj.format = KUtils.propValue("format", propobj, "");
              spropObj.required = KUtils.propValue("required", propobj, false);
              if (swud.required.length > 0) {
                //有required属性,需要再判断一次
                if (swud.required.indexOf(spropObj.name) > -1) {
                  //if($.inArray(spropObj.name,swud.required)>-1){
                  //存在
                  spropObj.required = true;
                }
              }
              //默认string类型
              var propValue = "";
              //判断是否有类型
              if (propobj.hasOwnProperty("type")) {
                var type = propobj["type"];
                //判断是否有example
                if (propobj.hasOwnProperty("example")) {
                  if (type == "string") {
                    propValue = String(KUtils.propValue("example", propobj, ""));
                  } else {
                    propValue = propobj["example"];
                  }
                } else if (KUtils.checkIsBasicType(type)) {
                  propValue = KUtils.getBasicTypeValue(type);
                  //此处如果是object情况,需要判断additionalProperties属性的情况
                  if (type == "object") {
                    if (propobj.hasOwnProperty("additionalProperties")) {
                      var addpties = propobj["additionalProperties"];
                      that.log("------解析map-=-----------additionalProperties,defName:" + name);
                      //判断是否additionalProperties中还包含additionalProperties属性
                      var addtionalName=this.deepAdditionalProperties(addpties,oas2);
                      //console.log("递归类型---"+addtionalName)
                      //判断是否有ref属性,如果有,存在引用类,否则默认是{}object的情况
                      if(KUtils.strNotBlank(addtionalName)){
                        //console.log("-------------------------addtionalName--------"+addtionalName)
                        //这里需要递归判断是否是本身,如果是,则退出递归查找
                        var globalArr = new Array();
                        //添加类本身
                        globalArr.push(name);
                        var addTempValue = null;
                        if (addtionalName != name) {
                          addTempValue = that.findRefDefinition(addtionalName, definitions, false, globalArr,null,oas2);
                        } else {
                          addTempValue = that.findRefDefinition(addtionalName, definitions, true,globalArr, name, oas2);
                        }
                        propValue = {
                          "additionalProperties1": addTempValue
                        }
                        //console.log(propValue)
                        spropObj.type = addtionalName;
                        spropObj.refType = addtionalName;
                      }
                      else if (addpties.hasOwnProperty("$ref")) {
                        var adref = addpties["$ref"];
                        var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                        if (regex.test(adref)) {
                          var addrefType = RegExp.$1;
                          var addTempValue = null;
                          //这里需要递归判断是否是本身,如果是,则退出递归查找
                          var globalArr = new Array();
                          //添加类本身
                          globalArr.push(name);

                          if (addrefType != name) {
                            addTempValue = that.findRefDefinition(addrefType, definitions, false, globalArr,null,oas2);
                          } else {
                            addTempValue = that.findRefDefinition(addrefType, definitions, true, globalArr, name,oas2);
                          }
                          propValue = {
                            "additionalProperties1": addTempValue
                          }
                          that.log("解析map-=完毕：")
                          that.log(propValue);
                          spropObj.type = addrefType;
                          spropObj.refType = addrefType;
                        }
                      } else if (addpties.hasOwnProperty("items")) {
                        //数组
                        var addPropItems = addpties["items"];

                        var adref = addPropItems["$ref"];
                        var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                        if (regex.test(adref)) {
                          var addrefType = RegExp.$1;
                          var addTempValue = null;
                          //这里需要递归判断是否是本身,如果是,则退出递归查找
                          var globalArr = new Array();
                          //添加类本身
                          globalArr.push(name);

                          if (addrefType != name) {
                            addTempValue = that.findRefDefinition(addrefType, definitions, false, globalArr,null,oas2);
                          } else {
                            addTempValue = that.findRefDefinition(addrefType, definitions, true, globalArr,name,oas2);
                          }
                          var tempAddValue = new Array();
                          tempAddValue.push(addTempValue);
                          propValue = {
                            "additionalProperties1": tempAddValue
                          }
                          that.log("解析map-=完毕：")
                          that.log(propValue);
                          spropObj.type = "array";
                          spropObj.refType = addrefType;
                        }
                      }
                    }
                  }
                } else {
                  if (type == "array") {
                    propValue = new Array();
                    var items = propobj["items"];
                    var ref = items["$ref"];
                    //此处有可能items是array
                    if (items.hasOwnProperty("type")) {
                      if (items["type"] == "array") {
                        ref = items["items"]["$ref"];
                      }
                    }
                    //判断是否存在枚举
                    if (items.hasOwnProperty("enum")) {
                      if (spropObj.description != "") {
                        spropObj.description += ",";
                      }
                      spropObj.description = spropObj.description + "可用值:" + items["enum"].join(",");
                    }
                    var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                    if (regex.test(ref)) {
                      var refType = RegExp.$1;
                      spropObj.refType = refType;
                      //这里需要递归判断是否是本身,如果是,则退出递归查找
                      var globalArr = new Array();
                      //添加类本身
                      globalArr.push(name);
                      if (refType != name) {
                        propValue.push(that.findRefDefinition(refType, definitions, false, globalArr,null,oas2));
                      } else {
                        propValue.push(that.findRefDefinition(refType, definitions, true, globalArr,name,oas2));
                      }
                    } else {
                      //schema基础类型显示
                      spropObj.refType = items["type"];
                    }
                  }
                }

              } else {
                //that.log("解析属性："+property);
                //that.log(propobj);
                if (propobj.hasOwnProperty("$ref")) {
                  var ref = propobj["$ref"];
                  var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
                  if (regex.test(ref)) {
                    var refType = RegExp.$1;
                    spropObj.refType = refType;
                    //这里需要递归判断是否是本身,如果是,则退出递归查找
                    var globalArr = new Array();
                    //添加类本身
                    globalArr.push(name);
                    if (refType != name) {
                      propValue = that.findRefDefinition(refType, definitions, false, globalArr,null,oas2);
                    } else {
                      propValue = that.findRefDefinition(refType, definitions, true, globalArr,null,oas2);
                    }

                  }
                } else {
                  propValue = {};
                }
              }
              spropObj.value = propValue;
              //判断是否有format,如果是integer,判断是64位还是32位
              if (spropObj.format != null && spropObj.format != undefined && spropObj.format != "") {
                //spropObj.type=spropObj.format;
                spropObj.type += "(" + spropObj.format + ")";
              }
              //判断最终类型
              if (spropObj.refType != null && spropObj.refType != "") {
                //判断基础类型,非数字类型
                if (spropObj.type == "string") {
                  spropObj.type = spropObj.refType;
                }
              }
              //addprop
              //这里判断去重
              if (!that.checkPropertiesExists(swud.properties, spropObj)) {
                swud.properties.push(spropObj);
                //如果当前属性readOnly=true，则实体类value排除此属性的值
                if (!spropObj.readOnly) {
                  defiTypeValue[property] = propValue;
                }
              }
            }
            swud.value = defiTypeValue;
          }
        }
        ////console("开始递归---------------deepTreeTableRefParameter")
        deepTreeTableRefParameter(swud, that, swud, swud,oas2);
        ////console(swud)
        //that.currentInstance.difArrs.push(swud);
        swud.init=true;
        break;
      }
    }
  }
}



/**
 * 解析所有的Model,但是不解析属性
 * @param {SwaggerJson对象实体} menu
 */
SwaggerBootstrapUi.prototype.analysisDefinitionRefModel=function(menu){
  var that = this;
  if(this.currentInstance.oas2()){
    this.analysisDefinitionRefModelOAS2(menu);
  }else{
    this.analysisDefinitionRefModelOAS3(menu);
  }
}
/**
 * 解析OAS2的类结构
 * @param {*} menu
 */
SwaggerBootstrapUi.prototype.analysisDefinitionRefModelOAS2=function(menu){
  var that = this;
  //解析definition
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("definitions")) {
    var definitions = menu["definitions"];
    //改用async的for循环
    for (var name in definitions) {
      //所有的类classModel
      var swud=swud = new SwaggerBootstrapUiDefinition();
      swud.name = name;
      swud.ignoreFilterName = name;
      that.currentInstance.difArrs.push(swud);
      //所有类classModel的treeTable参数
      var swudTree=new SwaggerBootstrapUiTreeTableRefParameter();
      swudTree.name=name;
      swudTree.id=md5(name);
      //存放值
      that.currentInstance.swaggerTreeTableModels[name] = swudTree;
    }
  }
}

/**
 * 解析OAS3的类结构
 * @param {*} menu
 */
SwaggerBootstrapUi.prototype.analysisDefinitionRefModelOAS3=function(menu){
  var that = this;
  //解析definition
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("components")) {
    var components=menu["components"];
    if(KUtils.checkUndefined(components)&&components.hasOwnProperty("schemas")){
      var definitions=components["schemas"];
      if(KUtils.checkUndefined(definitions)){
        //改用async的for循环
        for (var name in definitions) {
          //所有的类classModel
          var swud=swud = new SwaggerBootstrapUiDefinition();
          swud.name = name;
          swud.ignoreFilterName = name;
          that.currentInstance.difArrs.push(swud);
          //所有类classModel的treeTable参数
          var swudTree=new SwaggerBootstrapUiTreeTableRefParameter();
          swudTree.name=name;
          swudTree.id=md5(name);
          //存放值
          that.currentInstance.swaggerTreeTableModels[name] = swudTree;
        }
      }
    }
  }
}
/**
 * 异步解析Model的名称-SwaggerModel功能需要
 * @param {当前swagger实例对象id} instanceId
 * @param {model对象} treeTableModel
 */
SwaggerBootstrapUi.prototype.analysisDefinitionRefTableModel=function(instanceId,treeTableModel){
  //console.log("analysisDefinitionRefTableModel-异步解析Model的名称-SwaggerModel功能需要");
  //console.log(treeTableModel);
  var that=this;
  var originalTreeTableModel=treeTableModel;
  if(!treeTableModel.init){
    var instance=null;
    this.instances.forEach(ins=>{
      if(ins.id==instanceId){
        instance=ins;
      }
    })
    //console.log("当前实例")
    //console.log(instance)
    for(name in instance.swaggerTreeTableModels){
      if(name==treeTableModel.name){
        originalTreeTableModel=instance.swaggerTreeTableModels[name];
        if(!originalTreeTableModel.init){
          //开始加载属性
          originalTreeTableModel.init=true;
          //var definitions=instance.swaggerData["definitions"];
          //console.log(instance)
          var definitions=instance.getOASDefinitions();
          var oas2=instance.oas2();
          //console.log("analysisDefinitionRefTableModel:----------------"+oas2);
          //console.log(definitions)
          if(KUtils.checkUndefined(definitions)){
            for(var key in definitions){
              if(key==originalTreeTableModel.name){
                var def=definitions[key];
                //console.log("def");
                //根据def的properties解析
                if(KUtils.checkUndefined(def)){
                  if (def.hasOwnProperty("properties")) {
                    var props = def["properties"];
                    //获取required属性
                    var requiredArrs=def.hasOwnProperty("required")?def["required"]:new Array();
                    //console.log(props);
                    for(var pkey in props){
                      var p=props[pkey];
                      p.refType=that.getSwaggerModelRefType(p,oas2);
                      var refp = new SwaggerBootstrapUiParameter();
                      refp.pid = originalTreeTableModel.id;
                      refp.readOnly = p.readOnly;
                      refp.parentTypes.push(treeTableModel.name)
                      refp.parentTypes.push(key)
                      //refp.level = minfo.level + 1;
                      refp.name = pkey;
                      refp.type = p.type;
                      //判断非array
                      if (p.type != "array") {
                        if (p.refType != null && p.refType != undefined && p.refType != "") {
                          //修复针对schema类型的参数,显示类型为schema类型
                          refp.type = p.refType;
                        }
                      }
                      //refp.in = minfo.in;
                      if(KUtils.checkUndefined(p.require)){
                        refp.require = p.required;
                      }else{
                        if(requiredArrs.includes(pkey)){
                          refp.require=true;
                        }
                      }
                      refp.example = p.example;
                      var description = KUtils.propValue("description", p, "");
                      //判断是否包含枚举
                      if (p.hasOwnProperty("enum")) {
                        if (description != "") {
                          description += ",";
                        }
                        description = description + "可用值:" + p.enum.join(",");
                      }
                      refp.description = KUtils.replaceMultipLineStr(description);
                      //KUtils.validateJSR303(refp, p);
                      //models添加所有属性
                      originalTreeTableModel.params.push(refp);
                      //判断类型是否基础类型
                      if (KUtils.checkUndefined(p.refType) && !KUtils.checkIsBasicType(p.refType)) {
                        ////console("schema类型--------------" + p.refType)
                        refp.schemaValue = p.refType;
                        refp.schema = true;
                        //属性名称不同,或者ref类型不同
                        var deepDef = that.getOriginalDefinitionByName(p.refType,definitions);
                        //console.log("find-deepdef")
                        //console.log(deepDef)
                        if(KUtils.checkUndefined(deepDef)){
                          if(!refp.parentTypes.includes(p.refType)){
                            deepSwaggerModelsTreeTableRefParameter(refp, definitions, deepDef, originalTreeTableModel,that,oas2);
                          }
                        }

                         /*  if (!checkDeepTypeAppear(refp.parentTypes, p.refType)) {
                            deepTreeTableRefParameter(refp, that, deepDef, apiInfo);
                          } */
                      } else {
                        if (p.type == "array") {
                          if (p.refType != null && p.refType != undefined && p.refType != "") {
                            //修复针对schema类型的参数,显示类型为schema类型
                            refp.schemaValue = p.refType;
                             //属性名称不同,或者ref类型不同
                            var deepDef = that.getOriginalDefinitionByName(p.refType,definitions);
                            //console.log("find-deepdef")
                            //console.log(deepDef)
                            if(KUtils.checkUndefined(deepDef)){
                              if(!refp.parentTypes.includes(p.refType)){
                                deepSwaggerModelsTreeTableRefParameter(refp, definitions, deepDef, originalTreeTableModel,that,oas2);
                              }
                            }
                          }
                        }
                      }
                    }
                  }else if(def.hasOwnProperty("additionalProperties")){
                    //map类型
                    //var addpties = def["additionalProperties"];
                    //console.log("addtionalProperties")
                    //console.log(def["additionalProperties"])
                    var refType=that.getSwaggerModelRefType(def,oas2);
                    //console.log(refType)
                    var refp = new SwaggerBootstrapUiParameter();
                    refp.pid = originalTreeTableModel.id;
                    refp.readOnly = true;
                    refp.parentTypes.push(treeTableModel.name)
                    //refp.level = minfo.level + 1;
                    refp.name = "additionalProperty1";
                    refp.type = KUtils.propValue("title", def, "");
                    if(KUtils.checkUndefined(refType)){
                      refp.type = refType;
                    }
                    refp.parentTypes.push(treeTableModel.name)
                     //models添加所有属性
                    originalTreeTableModel.params.push(refp);
                    var deepDef = that.getOriginalDefinitionByName(refType,definitions);
                    if(KUtils.checkUndefined(deepDef)){
                      refp.schemaValue = refp.type;
                      refp.schema = true;
                      if(!refp.parentTypes.includes(refType)){
                        deepSwaggerModelsTreeTableRefParameter(refp, definitions, deepDef, originalTreeTableModel,that,oas2);
                      }
                    }

                  }
                }
              }
            }
          }
          instance.refTreeTableModels[name]=originalTreeTableModel;
        }
      }
    }
  }
  return originalTreeTableModel;
}

/**
 *
 * @param {Model名称} name
 * @param {definitions定义} definitions
 */
SwaggerBootstrapUi.prototype.getOriginalDefinitionByName=function(name,definitions){
  var def={name:name};
  for(var key in definitions){
    if(key==name){
      def["properties"]=definitions[key];
      break;
    }
  }
  return def;
}

/**
 * 判断当前类型是否是Array数组
 * @param {*} propobj
 * @param {*} oas2
 */
SwaggerBootstrapUi.prototype.getSwaggerModelRefArray=function(propobj,oas2){
  var arrayFlag=false;
  if (propobj.hasOwnProperty("type")) {
    var type = propobj["type"];
    if (type == "array") {
      arrayFlag=true;
    }
  }
  return arrayFlag;
}
/**
 * 获取当前属性的refType类型
 * @param {*} property
 * @param {*} oas2 是否是2类型
 */
SwaggerBootstrapUi.prototype.getSwaggerModelRefType=function(propobj,oas2){
  var refType=null;
  if (propobj.hasOwnProperty("type")) {
    var type = propobj["type"];
    //判断是否有example
   if (KUtils.checkIsBasicType(type)) {
      //此处如果是object情况,需要判断additionalProperties属性的情况
      if (type == "object") {
        if (propobj.hasOwnProperty("additionalProperties")) {
          var addpties = propobj["additionalProperties"];
          //判断是否additionalProperties中还包含additionalProperties属性
          var addtionalName=this.deepAdditionalProperties(addpties,oas2);
          //console.log("递归类型---"+addtionalName)
          //判断是否有ref属性,如果有,存在引用类,否则默认是{}object的情况
          if(KUtils.strNotBlank(addtionalName)){
             refType = addtionalName;
          }
          else if (addpties.hasOwnProperty("$ref")) {
            var adref = addpties["$ref"];
            var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
            if (regex.test(adref)) {
              refType= RegExp.$1;
            }
          } else if (addpties.hasOwnProperty("items")) {
            //数组
            var addPropItems = addpties["items"];

            var adref = addPropItems["$ref"];
            var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
            if (regex.test(adref)) {
              refType = RegExp.$1;
            }
          }
        }
      }
    } else {
      if (type == "array") {
        var items = propobj["items"];
        if(KUtils.checkUndefined(items)){
          var ref = items["$ref"];
          //此处有可能items是array
          if (items.hasOwnProperty("type")) {
            if (items["type"] == "array") {
              ref = items["items"]["$ref"];
            }
          }
          var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
          if (regex.test(ref)) {
            refType = RegExp.$1;
          } else {
            //schema基础类型显示
            refType = items["type"];
          }
        }
      }
    }
  } else {
    if (propobj.hasOwnProperty("$ref")) {
      var ref = propobj["$ref"];
      var regex = new RegExp(KUtils.oasmodel(oas2), "ig");
      if (regex.test(ref)) {
        refType = RegExp.$1;
      }
    }
  }
  return refType;

}
/**
 *
 * @param {*} parentRefp
 * @param {*} definitions
 * @param {*} deepDef
 * @param {*} originalTreeTableModel
 */
function deepSwaggerModelsTreeTableRefParameter(parentRefp,definitions, deepDef,originalTreeTableModel,that,oas2){
  if(KUtils.checkUndefined(definitions)){
    for(var key in definitions){
      if(key==deepDef.name){
        var def=definitions[key];
        //根据def的properties解析
        if(KUtils.checkUndefined(def)){
          if (def.hasOwnProperty("properties")) {
            var props = def["properties"];
            //获取required属性
            var requiredArrs=def.hasOwnProperty("required")?def["required"]:new Array();
            for(var pkey in props){
              var p=props[pkey]
              p.refType=that.getSwaggerModelRefType(p,oas2);
              var refp = new SwaggerBootstrapUiParameter();
              refp.pid = parentRefp.id;
              refp.readOnly = p.readOnly;
              parentRefp.parentTypes.forEach(function (pt) {
                refp.parentTypes.push(pt);
              })
              refp.parentTypes.push(key)
              refp.level = parentRefp.level + 1;
              refp.name = pkey;
              refp.type = p.type;
              //判断非array
              if (p.type != "array") {
                if (p.refType != null && p.refType != undefined && p.refType != "") {
                  //修复针对schema类型的参数,显示类型为schema类型
                  refp.type = p.refType;
                }
              }
              //refp.in = minfo.in;
              if(KUtils.checkUndefined(p.require)){
                refp.require = p.required;
              }else{
                if(requiredArrs.includes(pkey)){
                  refp.require=true;
                }
              }
              refp.example = p.example;
              var description = KUtils.propValue("description", p, "");
              //判断是否包含枚举
              if (p.hasOwnProperty("enum")) {
                if (description != "") {
                  description += ",";
                }
                description = description + "可用值:" + p.enum.join(",");
              }
              refp.description = KUtils.replaceMultipLineStr(description);
              //KUtils.validateJSR303(refp, p);
              //models添加所有属性
              if(parentRefp.children==null){
                parentRefp.children=new Array();
              }
              parentRefp.children.push(refp);
              //originalTreeTableModel.params.push(refp);
              //判断类型是否基础类型
              if (KUtils.checkUndefined(p.refType) && !KUtils.checkIsBasicType(p.refType)) {
                ////console("schema类型--------------" + p.refType)
                refp.schemaValue = p.refType;
                refp.schema = true;
                //属性名称不同,或者ref类型不同
                var childdeepDef = that.getOriginalDefinitionByName(p.refType,definitions);
                if(!refp.parentTypes.includes(p.refType)){
                  deepSwaggerModelsTreeTableRefParameter(refp, definitions, childdeepDef,originalTreeTableModel,that,oas2);
                }
                 /*  if (!checkDeepTypeAppear(refp.parentTypes, p.refType)) {
                    deepTreeTableRefParameter(refp, that, deepDef, apiInfo);
                  } */
              } else {
                if (p.type == "array") {
                  if (p.refType != null && p.refType != undefined && p.refType != "") {
                    //修复针对schema类型的参数,显示类型为schema类型
                    refp.schemaValue = p.refType;
                    //属性名称不同,或者ref类型不同
                    var childdeepDef = that.getOriginalDefinitionByName(p.refType,definitions);
                    if(!refp.parentTypes.includes(p.refType)){
                      deepSwaggerModelsTreeTableRefParameter(refp, definitions, childdeepDef,originalTreeTableModel,that,oas2);
                    }
                  }
                }
              }
            }
          }else if(def.hasOwnProperty("additionalProperties")){
            //map类型
            //var addpties = def["additionalProperties"];
            var refType=that.getSwaggerModelRefType(def,oas2);
            var refp = new SwaggerBootstrapUiParameter();
            refp.pid = originalTreeTableModel.id;
            refp.readOnly = true;
            refp.parentTypes.push(treeTableModel.name)
            //refp.level = minfo.level + 1;
            refp.name = "additionalProperty1";
            refp.type = KUtils.propValue("title", def, "");
            if(KUtils.checkUndefined(refType)){
              refp.type = refType;
            }
            refp.parentTypes.push(treeTableModel.name)
            //models添加所有属性
            if(parentRefp.children==null){
              parentRefp.children=new Array();
            }
            parentRefp.children.push(refp);
            var deepDef = that.getOriginalDefinitionByName(refType,definitions);
            if(KUtils.checkUndefined(deepDef)){
              refp.schemaValue = refp.type;
              refp.schema = true;
              if(!refp.parentTypes.includes(refType)){
                deepSwaggerModelsTreeTableRefParameter(refp, definitions, deepDef, originalTreeTableModel,that,oas2);
              }
            }

          }
        }
      }
    }
  }
}

/***
 * 解析实例属性
 */
SwaggerBootstrapUi.prototype.analysisDefinition = function (menu) {
  var that = this;
  this.currentInstance.swaggerData=menu;
  //解析definition
  //放弃解析所有的Model结构
  that.analysisDefinitionRefModel(menu);
  //解析tags标签
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("tags")) {
    var tags = menu["tags"];
    //判断是否开启增强配置
    if (that.settings.enableSwaggerBootstrapUi) {
      var sbu = menu["swaggerBootstrapUi"]
      if (KUtils.checkUndefined(sbu)) {
        if (KUtils.checkUndefined(sbu.tagSortLists)) {
          tags = sbu["tagSortLists"];
        }
      }
    }
    tags.forEach(function (tag) {
      //此处替换tag.name中的/字符,以避免在ui中因为使用vue-router的问题导致空白页面出现
      var swuTag = new SwaggerBootstrapUiTag(KUtils.toString(tag.name,"").replace(/\//g,'-'), tag.description);
      if (KUtils.strNotBlank(tag.author)) {
        swuTag.author = tag.author;
      }
      that.currentInstance.tags.push(swuTag);
    })
  }
  //解析paths属性
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("paths")) {
    var paths = menu["paths"];
    that.log("开始解析Paths.................")
    that.log(new Date().toTimeString());
    var pathStartTime = new Date().getTime();
    var _supportMethods = ["get", "post", "put", "delete", "patch", "options", "trace", "head", "connect"];
    async.forEachOf(paths, function (pathObject, path, callback) {
      //var pathObject=paths[path];
      var apiInfo = null;
      _supportMethods.forEach(function (method) {
        if (pathObject.hasOwnProperty(method)) {
          apiInfo = pathObject[method]
          if (apiInfo != null) {
            var ins = that.createApiInfoInstance(path, method, apiInfo);
            that.currentInstance.paths.push(ins);
            ins.hashCollections.forEach(function (hashurl) {
              that.currentInstance.pathsDictionary[hashurl] = ins;
            })
            that.methodCountAndDown(method.toUpperCase());
          }
        }
      })

    })
    that.log("解析Paths结束,耗时：" + (new Date().getTime() - pathStartTime));
    that.log(new Date().toTimeString());
    //判断是否开启过滤
    if (that.settings.enableFilterMultipartApis) {
      //开启过滤
      that.currentInstance.paths.forEach(function (methodApi) {
        //判断是否包含
        var p = that.currentInstance.pathFilters[methodApi.url];
        if (p == null || p == undefined) {
          var d = new SwaggerBootstrapUiApiFilter();
          d.methods.push(methodApi);
          that.currentInstance.pathFilters[methodApi.url] = d;
        } else {
          p.methods.push(methodApi);
          that.currentInstance.pathFilters[methodApi.url] = p;
        }
      })
      var newPathArr = new Array();
      that.log(that.currentInstance.pathFilters)
      for (var url in that.currentInstance.pathFilters) {
        var saf = that.currentInstance.pathFilters[url];
        //that.log(url)
        //that.log(saf)
        //that.log(saf.api(that.settings.enableFilterMultipartApiMethodType))
        //that.log("")
        newPathArr = newPathArr.concat(saf.api(that.settings.enableFilterMultipartApiMethodType));
      }
      that.log("重新赋值。。。。。")
      //that.log(that.currentInstance.paths)
      ///that.log(newPathArr)
      //重新赋值
      that.currentInstance.paths = newPathArr;
      //that.log(that.currentInstance.paths)
    }
  }
  //解析securityDefinitions属性
  if (menu != null && typeof (menu) != "undefined" && menu != undefined && menu.hasOwnProperty("securityDefinitions")) {
    var securityDefinitions = menu["securityDefinitions"];
    if (securityDefinitions != null) {
      //判断是否有缓存cache值
      //var cacheSecurityData=$("#sbu-header").data("cacheSecurity");
      //var cacheSecurityData=that.getSecurityInfos();
      var cacheSecurityData = that.getGlobalSecurityInfos();
      var securityArr = new Array();
      for (var j in securityDefinitions) {
        var sdf = new SwaggerBootstrapUiSecurityDefinition();
        var sdobj = securityDefinitions[j];
        sdf.key = j;
        sdf.type = sdobj.type;
        sdf.name = sdobj.name;
        sdf.in = sdobj.in;
        var flag = false;
        if (cacheSecurityData != null && cacheSecurityData != undefined) {
          //存在缓存值,更新当前值,无需再次授权
          cacheSecurityData.forEach(function (sa) {
            //})
            //$.each(cacheSecurityData, function (i, sa) {
            if (sa.key == sdf.key && sa.name == sdf.name) {
              flag = true;
              sdf.value = sa.value;
            }
          })
        }
        /* if (!flag){
            //如果cache不存在,存储
            that.storeGlobalParam(sdf,"securityArrs");
        }*/
        //at 2019-12-7 18:22:01
        //得到主键id端
        var md5StrBefore = sdf.key + sdf.type + sdf.in + sdf.name;
        sdf.id = md5(md5StrBefore);
        securityArr.push(sdf);
        //that.currentInstance.securityArrs.push(sdf);
      }
      if (securityArr.length > 0) {
        that.currentInstance.securityArrs = securityArr;
        that.log("解析securityDefinitions属性--------------------------------------------------------------->")
        /* if (window.localStorage) {
          var store = window.localStorage;
          var storeKey = "SwaggerBootstrapUiSecuritys";
          var _securityValue = store[storeKey];
          that.log(that.currentInstance.name)
          //初始化
          var _secArr = new Array();
          var _key = md5(that.currentInstance.name);
          that.log(_securityValue)
          if (_securityValue != undefined && _securityValue != null && _securityValue != "") {
            that.log("判断：" + _key)
            //有值
            var _secTempArr = JSON.parse(_securityValue);
            var flag = false;
            //判断值是否存在
            _secTempArr.forEach(function (sta) {
              //})
              //$.each(_secTempArr, function (i, sta) {
              if (sta.key == _key) {
                that.log("exists")
                flag = true;
                _secArr.push({
                  key: _key,
                  value: securityArr
                })
              } else {
                _secArr.push(sta)
              }
            })
            if (!flag) {
              _secArr.push({
                key: _key,
                value: securityArr
              })
            }
          } else {
            var _secObject = {
              key: _key,
              value: securityArr
            };
            _secArr.push(_secObject);

          }
          that.log(_secArr)
          //store.setItem("securityArrs",JSON.stringify(securityArr))
          store.setItem(storeKey, JSON.stringify(_secArr))
        } */
      } else {
        //清空缓存
        that.clearSecuritys();
      }
    } else {
      //清空缓存security
      that.clearSecuritys();
    }
  }
  //console.log("分组------------")
  //console.log(that.currentInstance.cacheInstance)
  //tag分组
  that.currentInstance.tags.forEach(function (tag) {
    //})
    //$.each(that.currentInstance.tags, function (i, tag) {
    //如果是第一次加载,则所有api都是新接口,无需判断老新
    if (!that.currentInstance.firstLoad) {
      //判断是否新
      var tagNewApis = false;
      //是否改变
      var tagChangeApis = false;
      //查找childrens
      that.currentInstance.paths.forEach(methodApi => {
        //判断tags是否相同
        methodApi.tags.forEach(tagName => {
          if (tagName == tag.name) {
            //是否存在
            if (!that.currentInstance.cacheInstance.cacheApis.includes(methodApi.id)) {
              //}
              //if ($.inArray(methodApi.id, that.currentInstance.cacheInstance.cacheApis) < 0) {
              tagNewApis = true;
              methodApi.hasNew = true;
            }
            //console.log(methodApi)
            //判断作者
            if (!KUtils.strNotBlank(methodApi.author)) {
              if (KUtils.strNotBlank(tag.author)) {
                methodApi.author = tag.author;
              }
            }
            tag.childrens.push(methodApi);
          }
        })
      })
      if (tagNewApis) {
        tag.hasNew = true;
      } else {
        //不是新接口,判断接口是否变更
        that.currentInstance.paths.forEach(function (methodApi) {
          //})
          //$.each(that.currentInstance.paths, function (k, methodApi) {
          //判断tags是否相同
          methodApi.tags.forEach(function (tagName) {
            // $.each(methodApi.tags, function (x, tagName) {
            if (tagName == tag.name) {
              if (methodApi.hasChanged) {
                //已经存在变更
                tagChangeApis = true;
              }
            }
          })
        })
        tag.hasChanged = tagChangeApis;
      }
    } else {
      //查找childrens
      that.currentInstance.paths.forEach(function (methodApi) {
        //$.each(that.currentInstance.paths, function (k, methodApi) {
        //判断tags是否相同
        methodApi.tags.forEach(function (tagName) {
          //$.each(methodApi.tags, function (x, tagName) {
          if (tagName == tag.name) {
            //判断作者
            if (!KUtils.strNotBlank(methodApi.author)) {
              if (KUtils.strNotBlank(tag.author)) {
                methodApi.author = tag.author;
              }
            }
            tag.childrens.push(methodApi);
          }
        })
      })
    }

    if (that.settings.enableSwaggerBootstrapUi) {
      //排序childrens
      tag.childrens.sort(function (a, b) {
        return a.order - b.order;
      })
    }
  });

  if (that.currentInstance.firstLoad) {
    /*var c=new SwaggerBootstrapUiCacheApis();
    c.id=that.currentInstance.groupId;
    c.name=that.currentInstance.name;
    c.cacheApis=that.currentInstance.groupApis;*/
    //that.cacheApis.push(c);
    //that.currentInstance.cacheInstance.versionFlag=false;
    that.cacheApis.push(that.currentInstance.cacheInstance);
  } else {
    //更新？页面点击后方可更新
    //that.currentInstance.cacheInstance.versionFlag=false;
    //更新当前cacheApi
    if (that.cacheApis.length > 0) {
      that.cacheApis.forEach(function (ca) {
        //})
        //$.each(that.cacheApis, function (j, ca) {
        if (ca.id == that.currentInstance.cacheInstance.id) {
          ca.updateApis = that.currentInstance.cacheInstance.updateApis;
        }
      })
    }
  }

  //当前加入的cacheApi加入localStorage对象中
  that.storeCacheApis();
  //解析models
  //遍历paths属性中的请求以及响应Model参数,存在即加入,否则不加入

  that.log("开始解析refTreetableparameters属性.................")
  that.log(new Date().toTimeString());
  var pathStartTime = new Date().getTime();
  //models的逻辑从这里移除,放到单组件中进行异步加载,解决效率问题

  //自定义文档
  if (that.settings.enableSwaggerBootstrapUi) {
    var sbu = menu["swaggerBootstrapUi"]
    if (KUtils.checkUndefined(sbu)) {
      if (KUtils.checkUndefined(sbu.markdownFiles)) {
        sbu.markdownFiles.forEach(function (md) {
          let key = md5(md.title)
          that.currentInstance.markdownFiles.push({
            ...md,
            id: key
          })
        })
      }
    }
    //that.currentInstance.markdownFiles = sbu.markdownFiles;
  }
  that.log("解析refTreetableparameters结束,耗时：" + (new Date().getTime() - pathStartTime));
  that.log(new Date().toTimeString());

}
/***
 * 清空security
 */
SwaggerBootstrapUi.prototype.clearSecuritys = function () {
  this.localStore.setItem(Constants.globalSecurityParamPrefix, []);
}
/**
 * 处理Models
 * add at 2019-12-11 21:01:46
 */
SwaggerBootstrapUi.prototype.processModels = function () {
  var that = this;
  if (KUtils.checkUndefined(this.currentInstance.refTreeTableModels)) {
    for (var name in that.currentInstance.refTreeTableModels) {
      that.currentInstance.modelNames.push(name);
      var param = that.currentInstance.refTreeTableModels[name];
      var model = new SwaggerBootstrapUiModel(param.id, name);
      if (KUtils.arrNotEmpty(param.params)) {
        param.params.forEach(function (ps) {
          var newparam = {
            ...ps,
            pid: "-1"
          }
          model.data.push(newparam);
          if (ps.schema) {
            //查找当前ps的属性值
            deepTreeTableSchemaModel(model, that.currentInstance.refTreeTableModels, ps, newparam);
          }

        })
      }
      that.currentInstance.models.push(model);
    }
  }
}

/**
 * 递归查找
 * @param {*} model
 * @param {*} treeTableModel
 * @param {*} id
 * @param {*} rootParam
 */
function deepTreeTableSchemaModel(model, treeTableModel, param, rootParam) {
  ////console(model.name)
  if (KUtils.checkUndefined(param.schemaValue)) {
    var schema = treeTableModel[param.schemaValue]
    if (KUtils.checkUndefined(schema)) {
      rootParam.parentTypes.push(param.schemaValue);
      if (KUtils.arrNotEmpty(schema.params)) {
        schema.params.forEach(function (nmd) {
          //childrenparam需要深拷贝一个对象
          var childrenParam = {
            childrenTypes: nmd.childrenTypes,
            def: nmd.def,
            description: nmd.description,
            enum: nmd.enum,
            example: nmd.example,
            id: nmd.id,
            ignoreFilterName: nmd.ignoreFilterName,
            in: nmd.in,
            level: nmd.level,
            name: nmd.name,
            parentTypes: nmd.parentTypes,
            pid: nmd.pid,
            readOnly: nmd.readOnly,
            require: nmd.require,
            schema: nmd.schema,
            schemaValue: nmd.schemaValue,
            show: nmd.show,
            txtValue: nmd.txtValue,
            type: nmd.type,
            validateInstance: nmd.validateInstance,
            validateStatus: nmd.validateStatus,
            value: nmd.value
          }
          childrenParam.pid = param.id;
          childrenParam.parentParam = param;
          model.data.push(childrenParam);
          if (childrenParam.schema) {
            //存在schema,判断是否出现过
            if (rootParam.parentTypes.indexOf(childrenParam.schemaValue) == -1) {
              deepTreeTableSchemaModel(model, treeTableModel, childrenParam, rootParam);
            }
          }
        })
      }
    }
  }
}


function findModelChildren(md, modelData) {
  if (modelData != null && modelData != undefined && modelData.length > 0) {
    modelData.forEach(function (nmd) {
      var newnmd = {
        childrenTypes: nmd.childrenTypes,
        def: nmd.def,
        description: nmd.description,
        enum: nmd.enum,
        example: nmd.example,
        id: nmd.id,
        ignoreFilterName: nmd.ignoreFilterName,
        in: nmd.in,
        level: nmd.level,
        name: nmd.name,
        parentTypes: nmd.parentTypes,
        pid: nmd.pid,
        readOnly: nmd.readOnly,
        require: nmd.require,
        schema: nmd.schema,
        schemaValue: nmd.schemaValue,
        show: nmd.show,
        txtValue: nmd.txtValue,
        type: nmd.type,
        validateInstance: nmd.validateInstance,
        validateStatus: nmd.validateStatus,
        value: nmd.value
      }
      if (newnmd.pid == md.id) {
        newnmd.children = [];
        newnmd.childrenIds = [];
        findModelChildren(newnmd, modelData);
        //查找后如果没有,则将children置空
        if (newnmd.children.length == 0) {
          newnmd.children = null;
        }
        //判断是否存在
        if (md.childrenIds.indexOf(newnmd.id) == -1) {
          //不存在
          md.childrenIds.push(newnmd.id);
          md.children.push(newnmd);
        }
      }
    })
  }
}

/***
 * 创建简介页面
 */
SwaggerBootstrapUi.prototype.createDescriptionElement = function () {
  /*var that = this;
   var layui=that.layui;
  var element=layui.element;
  //内容覆盖
  //that.getDoc().html("");
  setTimeout(function () {
      var html = template('SwaggerBootstrapUiIntroScript', that.currentInstance);
      $("#mainTabContent").html("").html(html);
      element.tabChange('admin-pagetabs',"main");
      that.tabRollPage("auto");
  },10) */
}

/***
 * 根据分组id查找实例
 */
SwaggerBootstrapUi.prototype.selectInstanceByGroupId = function (id) {
  var that = this;
  var instance = null;
  //console(that.instances)
  that.instances.forEach(function (group) {
    //})
    //$.each(that.instances, function (i, id) {
    if (group.id == id) {
      instance = group;
      return;
    }
  })
  return instance;
}

/**
 * 从外部VUE对象中获取i18n的实例
 */
SwaggerBootstrapUi.prototype.getI18n=function(){
  //return this.$Vue.getCurrentI18nInstance();
  return this.i18nInstance;
}

/***
 * 创建左侧菜单按钮
 * @param menu
 */
SwaggerBootstrapUi.prototype.createDetailMenu = function (addFlag) {
  var that = this;
  //创建菜单数据
  var menuArr = [];
  that.log(that.currentInstance)
  var groupName = that.currentInstance.name;
  var groupId = that.currentInstance.id;
  //console.log("----------------createDetailMenu")
  //console.log(this.i18nInstance);
  //主页
  menuArr.push({
    groupName: groupName,
    groupId: groupId,
    key: 'kmain',
    /* name: '主页', */
    name: this.getI18n().menu.home,
    i18n:'home',
    component: 'Main',
    icon: 'icon-home',
    path: 'home',
  })
  //是否有全局参数
  if (that.currentInstance.securityArrs != null && that.currentInstance.securityArrs.length > 0) {
    menuArr.push({
      groupName: groupName,
      groupId: groupId,
      key: 'Authorize' + md5(groupName),
      name: 'Authorize',
      tabName: 'Authorize(' + groupName + ')',
      component: 'Authorize',
      icon: 'icon-authenticationsystem',
      path: 'Authorize/' + groupName,
    })
  }
  //Swagger通用Models add by xiaoyumin 2018-11-6 13:26:45
  menuArr.push({
    groupName: groupName,
    groupId: groupId,
    key: 'swaggerModel' + md5(groupName),
    name: 'Swagger Models',
    component: 'SwaggerModels',
    tabName: 'Swagger Models(' + groupName + ')',
    icon: 'icon-modeling',
    path: 'SwaggerModels/' + groupName,
  })
  //文档管理
  menuArr.push({
    groupName: groupName,
    groupId: groupId,
    key: 'documentManager' + md5(groupName),
    i18n:'manager',
    /* name: '文档管理', */
    name:this.getI18n().menu.manager,
    icon: 'icon-zdlxb',
    path: 'documentManager',
    children: [{
        groupName: groupName,
        groupId: groupId,
        key: 'globalParameters' + md5(groupName),
       /*  name: '全局参数设置',
        tabName: '全局参数设置(' + groupName + ')', */
        name: this.getI18n().menu.globalsettings,
        i18n:'globalsettings',
        tabName: this.getI18n().menu.globalsettings+'(' + groupName + ')',
        component: 'GlobalParameters',
        path: 'GlobalParameters-' + groupName
      },
      {
        groupName: groupName,
        groupId: groupId,
        key: 'OfficelineDocument' + md5(groupName),
       /*  name: '离线文档',
        tabName: '离线文档(' + groupName + ')', */
        name: this.getI18n().menu.officeline,
        i18n:'officeline',
        tabName: this.getI18n().menu.officeline+'(' + groupName + ')',
        component: 'OfficelineDocument',
        path: 'OfficelineDocument-' + groupName
      },
      {
        groupName: groupName,
        groupId: groupId,
        key: 'Settings' + md5(groupName),
        /* name: '个性化设置', */
        name: this.getI18n().menu.selfSettings,
        i18n:'selfSettings',
        component: 'Settings',
        path: 'Settings'
        // hideInBreadcrumb: true,
        // hideInMenu: true,
      }
    ]
  })
  //自定义文档
  if (that.settings.enableSwaggerBootstrapUi) {
    //如果是启用
    //判断自定义文档是否不为空
    if (that.currentInstance.markdownFiles != null && that.currentInstance.markdownFiles.length > 0) {
      var mdlength = that.currentInstance.markdownFiles.length;
      //存在自定义文档
      var otherMarkdowns = {
        groupName: groupName,
        groupId: groupId,
        key: 'otherMarkdowns',
        /* name: '其他文档', */
        name:this.getI18n().menu.other,
        i18n:'other',
        icon: 'icon-APIwendang',
        path: 'otherMarkdowns',
        children: []
      }
      that.currentInstance.markdownFiles.forEach(function (md) {
        var unmdkey = md5(md.title);
        otherMarkdowns.children.push({
          groupName: groupName,
          groupId: groupId,
          key: unmdkey,
          component: 'OtherMarkdown',
          name: md.title,
          path: unmdkey
        })
      })
      menuArr.push(otherMarkdowns);
    }
  }
  //接口文档
  that.currentInstance.tags.forEach(function (tag) {
    //})
    //$.each(that.currentInstance.tags, function (i, tag) {
    var len = tag.childrens.length;
    var _lititle = "";
    if (len == 0) {
      if (that.settings.showTagStatus) {
        _lititle = tag.name + "(" + tag.description + ")";
      } else {
        _lititle = tag.name;
      }
      menuArr.push({
        groupName: groupName,
        groupId: groupId,
        key: md5(_lititle),
        name: _lititle,
        icon: 'icon-APIwendang',
        path: groupName + "/" + tag.name
      })
    } else {
      if (that.settings.showTagStatus) {
        _lititle = tag.name + "(" + tag.description + ")";
      } else {
        _lititle = tag.name;
      }
      var tagMenu = {
        groupName: groupName,
        groupId: groupId,
        key: md5(_lititle),
        name: _lititle,
        icon: 'icon-APIwendang',
        path: groupName + "/" + tag.name,
        hasNew: tag.hasNew || tag.hasChanged,
        num:null,
        children: []
      }
      tag.childrens.forEach(function (children) {
        //})
        //$.each(tag.childrens, function (i, children) {
        var tabSubMenu = {
          groupName: groupName,
          groupId: groupId,
          key: md5(groupName + children.summary + children.operationId),
          name: children.summary,
          description: children.description,
          path: children.operationId,
          component: 'ApiInfo',
          hasNew: children.hasNew || children.hasChanged,
          deprecated: children.deprecated,
          //用于搜索
          url: children.url,
          method:children.methodType.toUpperCase(),
          menuClass:'knife4j-menu-left-style'
        }
        tagMenu.children.push(tabSubMenu);
      })
      //给接口数量赋值
      tagMenu.num=tagMenu.children.length;
      menuArr.push(tagMenu);

    }
  })
  ////console(menuArr)
  var mdata = KUtils.formatter(menuArr);
  //添加全局参数
  if (addFlag) {
    that.globalMenuDatas = that.globalMenuDatas.concat(mdata);
  }
  ////console(JSON.stringify(mdata))
  //双向绑定

  this.menuData=mdata;
  this.store.dispatch("globals/setMenuData", mdata);
  /* that.$Vue.MenuData = mdata;
  that.$Vue.swaggerCurrentInstance = that.currentInstance;
  that.$Vue.$store.dispatch("globals/setMenuData", mdata); */
  //根据i18n更新菜单的数据
  //设置菜单选中
  //that.selectDefaultMenu(mdata);
  that.log("菜单初始化完成...")
}



/***
 * 判断属性是否已经存在
 * @param properties
 * @param prop
 */
SwaggerBootstrapUi.prototype.checkPropertiesExists = function (properties, prop) {
  var flag = false;
  if (properties != null && properties != undefined && properties.length > 0 && prop != null && prop != undefined) {
    properties.forEach(function (p) {
      if (p.name == prop.name && p.in == prop.in && p.type == prop.type) {
        flag = true;
      }
    })
  }
  return flag;
}
/***
 * 缓存对象
 */
SwaggerBootstrapUi.prototype.storeCacheApis = function () {
  var that = this;
  that.log("缓存对象...storeCacheApis-->")
  /* if (window.localStorage) {
    var store = window.localStorage;
    that.log(that.cacheApis);
    var str = JSON.stringify(that.cacheApis);
    store.setItem("SwaggerBootstrapUiCacheApis", str);
  } */
  that.localStore.setItem(Constants.globalGitApiVersionCaches, that.cacheApis);
}

//二次解析
SwaggerBootstrapUi.prototype.initApiInfoAsync=function(swpinfo){
  if(swpinfo.oas2){
    this.initApiInfoAsyncOAS2(swpinfo);
  }else{
    this.initApiInfoAsyncOAS3(swpinfo);
  }
}

/**
 * 解析oas2的接口
 * @param {*} swpinfo
 */
SwaggerBootstrapUi.prototype.initApiInfoAsyncOAS2=function(swpinfo){
  var that=this;
  var apiInfo=swpinfo.originalApiInfo;
  if(!swpinfo.init){
    //如果当前对象未初始化,进行初始化
    if (apiInfo.hasOwnProperty("parameters")) {
      var pameters = apiInfo["parameters"];
      pameters.forEach(function (m) {
        //})
        //$.each(pameters, function (i, m) {
        var originalName = KUtils.propValue("name", m, "");
        var inType = KUtils.propValue("in", m, "");
        //忽略参数
        //if (swpinfo.ignoreParameters == null || (swpinfo.ignoreParameters != null && !swpinfo.ignoreParameters.hasOwnProperty(originalName))) {
        //暂时放弃增加includeParameters的新特性支持
        //if (KUtils.filterIncludeParameters(inType, originalName, swpinfo.includeParameters)) {
        if(swpinfo.includeParameters!=null){
          //直接判断include的参数即可
          if (KUtils.filterIncludeParameters(inType, originalName, swpinfo.includeParameters)) {
            that.assembleParameter(m,swpinfo);
          }
        }else{
          if (KUtils.filterIgnoreParameters(inType, originalName, swpinfo.ignoreParameters)) {
            that.assembleParameter(m,swpinfo);
          }
        }

        //}
      })
    }
    var definitionType = null;
    var arr = false;
    //解析responsecode
    if (typeof (apiInfo.responses) != 'undefined' && apiInfo.responses != null) {
      var resp = apiInfo.responses;
      var rpcount = 0;
      for (var status in resp) {
        var swaggerResp = new SwaggerBootstrapUiResponseCode();
        var rescrobj = resp[status];
        swaggerResp.code = status;
        swaggerResp.oas2=swpinfo.oas2;
        swaggerResp.description = rescrobj["description"];
        var rptype = null;
        if (rescrobj.hasOwnProperty("schema")&&KUtils.checkUndefined(rescrobj["schema"])) {
          var schema = rescrobj["schema"];
          //单引用类型
          //判断是否是数组类型
          var regex = new RegExp("#/definitions/(.*)$", "ig");
          if (schema.hasOwnProperty("$ref")) {
            if (regex.test(schema["$ref"])) {
              var ptype = RegExp.$1;
              swpinfo.responseParameterRefName = ptype;
              swaggerResp.responseParameterRefName = ptype;
              definitionType = ptype;
              rptype = ptype;
              swaggerResp.schema = ptype;
            }
          } else if (schema.hasOwnProperty("type")) {
            var t = schema["type"];
            if (t == "array") {
              arr = true;
              if (schema.hasOwnProperty("items")) {
                var items = schema["items"];
                var itref = items["$ref"];
                //此处需判断items是否数组
                if (items.hasOwnProperty("type")) {
                  if (items["type"] == "array") {
                    itref = items["items"]["$ref"];
                  }
                }
                if (regex.test(itref)) {
                  var ptype = RegExp.$1;
                  swpinfo.responseParameterRefName = ptype;
                  swaggerResp.responseParameterRefName = ptype;
                  definitionType = ptype;
                  rptype = ptype;
                  swaggerResp.schema = ptype;
                }
              }
            } else {
              //判断是否存在properties属性
              if (schema.hasOwnProperty("properties")) {
                swaggerResp.schema = t;
                //自定义类型、放入difarrs对象中
                var swud = new SwaggerBootstrapUiDefinition();
                swud.name = swpinfo.id;
                swud.description = "自定义Schema";
                definitionType = swud.name;
                rptype = swud.name;
                swaggerResp.responseParameterRefName = swud.name;

                var properties = schema["properties"];
                var defiTypeValue = {};
                for (var property in properties) {
                  var spropObj = new SwaggerBootstrapUiProperty();
                  spropObj.name = property;
                  var propobj = properties[property];
                  spropObj.originProperty = propobj;
                  spropObj.type = KUtils.propValue("type", propobj, "string");
                  spropObj.description = KUtils.propValue("description", propobj, "");
                  spropObj.example = KUtils.propValue("example", propobj, "");
                  spropObj.format = KUtils.propValue("format", propobj, "");
                  spropObj.required = KUtils.propValue("required", propobj, false);
                  if (swud.required.length > 0) {
                    //有required属性,需要再判断一次
                    //if ($.inArray(spropObj.name, swud.required) > -1) {
                    if (swud.required.includes(spropObj.name)) {
                      //存在
                      spropObj.required = true;
                    }
                  }
                  //默认string类型
                  var propValue = "";
                  //判断是否有类型
                  if (propobj.hasOwnProperty("type")) {
                    var type = propobj["type"];
                    //判断是否有example
                    if (propobj.hasOwnProperty("example")) {
                      if (type == "string") {
                        propValue = String(KUtils.propValue("example", propobj, ""));
                      } else {
                        propValue = propobj["example"];
                      }
                    } else if (KUtils.checkIsBasicType(type)) {
                      propValue = KUtils.getBasicTypeValue(type);
                    }

                  }
                  spropObj.value = propValue;
                  //判断是否有format,如果是integer,判断是64位还是32位
                  if (spropObj.format != null && spropObj.format != undefined && spropObj.format != "") {
                    //spropObj.type=spropObj.format;
                    spropObj.type += "(" + spropObj.format + ")";
                  }
                  swud.properties.push(spropObj);
                  defiTypeValue[property] = propValue;
                }
                swud.value = defiTypeValue;
                swud.init=true;
                that.currentInstance.difArrs.push(swud);
              } else {
                //判断是否是基础类型
                if (KUtils.checkIsBasicType(t)) {
                  //基础类型
                  swpinfo.responseText = t;
                  swpinfo.responseBasicType = true;

                  //响应状态码的响应内容
                  swaggerResp.responseText = t;
                  swaggerResp.responseBasicType = true;
                }
              }
            }
          }
        }
        if (rptype != null) {
          //查询
         /*  for (var i = 0; i < that.currentInstance.difArrs.length; i++) {
            var ref = that.currentInstance.difArrs[i];
            if (ref.name == rptype) {
              if(!ref.init){
                //如果该类没有加载,则进行加载
                that.analysisDefinitionAsync(that.currentInstance.swaggerData,ref);
              }
              if (arr) {
                var na = new Array();
                na.push(ref.value);
                swaggerResp.responseValue = JSON.stringify(na, null, "\t");
                swaggerResp.responseJson = na;
              } else {
                swaggerResp.responseValue = JSON.stringify(ref.value, null, "\t");
                swaggerResp.responseJson = ref.value;
              }
            }
          } */
          //响应参数
          var def = that.getDefinitionByName(rptype,swpinfo.oas2);
          if (def != null) {
            if (arr) {
              var na = new Array();
              na.push(def.value);
              //swaggerResp.responseValue = JSON.stringify(na, null, "\t");
              swaggerResp.responseValue = KUtils.json5stringifyFormat(na, null, "\t");
              swaggerResp.responseJson = na;
            } else {
              //swaggerResp.responseValue = JSON.stringify(def.value, null, "\t");
              swaggerResp.responseValue = KUtils.json5stringifyFormat(def.value, null, "\t");
              swaggerResp.responseJson = def.value;
            }
            if (def.hasOwnProperty("properties")) {
              var props = def["properties"];
              props.forEach(function (p) {
                //})
                //$.each(props, function (i, p) {
                var resParam = new SwaggerBootstrapUiParameter();
                resParam.name = p.name;
                if (!KUtils.checkParamArrsExists(swaggerResp.responseParameters, resParam)) {
                  swaggerResp.responseParameters.push(resParam);
                  resParam.description = KUtils.replaceMultipLineStr(p.description);
                  if (p.type == null || p.type == "") {
                    if (p.refType != null) {
                      if (!KUtils.checkIsBasicType(p.refType)) {
                        resParam.schemaValue = p.refType;
                        resParam.schema = true;
                        //存在引用类型,修改默认type
                        resParam.type = p.refType;
                        var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                        deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        resParam.parentTypes.push(p.refType);
                        deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                      }
                    }
                  } else {
                    resParam.type = p.type;
                    if (!KUtils.checkIsBasicType(p.type)) {
                      if (p.refType != null) {
                        if (!KUtils.checkIsBasicType(p.refType)) {
                          resParam.schemaValue = p.refType;
                          resParam.schema = true;
                          //存在引用类型,修改默认type
                          if (p.type != "array") {
                            resParam.type = p.refType;
                          }
                          var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                          deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                          resParam.parentTypes.push(p.refType);
                          deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        }
                      } else {
                        resParam.schemaValue = p.type;
                        resParam.schema = true;
                        //存在引用类型,修改默认type
                        resParam.type = p.type;
                        var deepDef = that.getDefinitionByName(p.type,swpinfo.oas2);
                        deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        resParam.parentTypes.push(p.type);
                        deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                      }
                    }
                  }
                }
              })

            }
          }
        }

        if (swaggerResp.schema != null && swaggerResp.schema != undefined) {
          rpcount = rpcount + 1;
        }
        //判断是否有响应headers
        if (rescrobj.hasOwnProperty("headers")) {
          var _headers = rescrobj["headers"];
          swaggerResp.responseHeaderParameters = new Array();
          for (var _headerN in _headers) {
            var _hv = {
              ..._headers[_headerN],
              name: _headerN,
              id: md5(_headerN),
              pid: "-1"
            }
            /*
            var _hv = $.extend({}, _headers[_headerN], {
              name: _headerN,
              id: md5(_headerN),
              pid: "-1"
            }); */
            swaggerResp.responseHeaderParameters.push(_hv);
          }
          if (status == "200") {
            swpinfo.responseHeaderParameters = swaggerResp.responseHeaderParameters;
          }
        }
        swpinfo.responseCodes.push(swaggerResp);
      }
      swpinfo.multipartResponseSchemaCount = rpcount;
      if (rpcount > 1) {
        swpinfo.multipartResponseSchema = true;
      }
    }

    if (definitionType != null && !swpinfo.multipartResponseSchema) {
      //查询
      for (var i = 0; i < that.currentInstance.difArrs.length; i++) {
        var ref = that.currentInstance.difArrs[i];
        if (ref.name == definitionType) {
          if(!ref.init){
            //如果该类没有加载,则进行加载
            that.analysisDefinitionAsync(that.currentInstance.swaggerData,ref);
          }
          if (arr) {
            var na = new Array();
            na.push(ref.value);
            //swpinfo.responseValue = JSON.stringify(na, null, "\t");
            swpinfo.responseValue = KUtils.json5stringifyFormat(na, null, "\t");
            swpinfo.responseJson = na;
          } else {
            //swpinfo.responseValue = JSON.stringify(ref.value, null, "\t");
            swpinfo.responseValue = KUtils.json5stringifyFormat(ref.value, null, "\t");
            swpinfo.responseJson = ref.value;
          }
        }
      }
      //响应参数
      var def = that.getDefinitionByName(definitionType,swpinfo.oas2);
      if (def != null) {
        if (def.hasOwnProperty("properties")) {
          var props = def["properties"];
          props.forEach(function (p) {
            //})
            //$.each(props, function (i, p) {
            var resParam = new SwaggerBootstrapUiParameter();
            resParam.name = p.name;
            if (!KUtils.checkParamArrsExists(swpinfo.responseParameters, resParam)) {
              swpinfo.responseParameters.push(resParam);
              resParam.description = KUtils.replaceMultipLineStr(p.description);
              if (p.type == null || p.type == "") {
                if (p.refType != null) {
                  if (!KUtils.checkIsBasicType(p.refType)) {
                    resParam.schemaValue = p.refType;
                    resParam.schema = true;
                    //存在引用类型,修改默认type
                    resParam.type = p.refType;
                    var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                    deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                    resParam.parentTypes.push(p.refType);
                    deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                  }
                }
              } else {
                resParam.type = p.type;
                if (!KUtils.checkIsBasicType(p.type)) {
                  if (p.refType != null) {
                    if (!KUtils.checkIsBasicType(p.refType)) {
                      resParam.schemaValue = p.refType;
                      //存在引用类型,修改默认type
                      if (p.type != "array") {
                        resParam.type = p.refType;
                      }
                      var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                      deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                      resParam.parentTypes.push(p.refType);
                      deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                    }
                  } else {
                    resParam.schemaValue = p.type;
                    //存在引用类型,修改默认type
                    resParam.type = p.type;
                    var deepDef = that.getDefinitionByName(p.type,swpinfo.oas2);
                    deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                    resParam.parentTypes.push(p.type);
                    deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                  }
                }
              }
            }
          })

        }
      }

    }
      //获取请求json
    //统计body次数
    if (swpinfo.parameters != null) {
      var count = 0;
      var tmpJsonValue = null;
      var tmpRootXmlName = "";
      swpinfo.parameters.forEach(function (p) {
        //})
        //$.each(swpinfo.parameters, function (i, p) {
        if (p.in == "body") {
          count = count + 1;
          if (p.txtValue != null && p.txtValue != "") {
            tmpJsonValue = p.txtValue;
            tmpRootXmlName = p.schemaValue;
          }
        }
      })
      if (count == 1) {
        swpinfo.requestValue = tmpJsonValue;
        //判断consume是否是XML
        //https://gitee.com/xiaoym/knife4j/issues/I1BCKB
        if (KUtils.arrNotEmpty(swpinfo.consumes)) {
          var notEmptyConsumes = swpinfo.consumes.filter(consume => KUtils.strNotBlank(consume));
          if (KUtils.arrNotEmpty(notEmptyConsumes)) {
            var xmlRequest = notEmptyConsumes.some(consume => consume.toLowerCase().indexOf("xml") > -1);
            if (xmlRequest) {
              //是Xml请求
              if (KUtils.strNotBlank(tmpJsonValue)) {
                var tmpJsonObject = KUtils.json5parse(tmpJsonValue);
                var builder = new xml2js.Builder({
                  rootName: tmpRootXmlName
                });
                var obj = builder.buildObject(tmpJsonObject);
                swpinfo.requestValue = builder.buildObject(tmpJsonObject);
                swpinfo.xmlRequest = true;
              }
            }

          }
        }
      }
      //此处判断接口的请求参数类型
      //判断consumes请求类型
      if (apiInfo.consumes != undefined && apiInfo.consumes != null && apiInfo.consumes.length > 0) {
        var ctp = apiInfo.consumes[0];
        //if (ctp == "multipart/form-data") {
          //console.log("consumes:"+ctp)
        if (ctp.indexOf("multipart/form-data")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "form-data";
        } else if (ctp.indexOf("text/plain")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "raw";
          swpinfo.contentShowValue = "Text(text/plain)";
          swpinfo.contentMode = "text";
        } else if (ctp.indexOf("application/xml")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "raw";
          swpinfo.contentShowValue = "XML(application/xml)";
          swpinfo.contentMode = "xml";
        }else {
          //根据参数遍历,否则默认是表单x-www-form-urlencoded类型
          var defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
          var defaultValue = "x-www-form-urlencoded";
          //解决springfox的默认bug，存在form参数，接口consumes却是json请求类型
          if(KUtils.arrNotEmpty(swpinfo.parameters)){
            //参数不为空,从参数判断
            for (var i = 0; i < swpinfo.parameters.length; i++) {
              var pt = swpinfo.parameters[i];
              if (pt.in == "body") {
                if (pt.schemaValue == "MultipartFile") {
                  defaultType = "multipart/form-data";
                  defaultValue = "form-data";
                  break;
                } else {
                  defaultValue = "raw";
                  defaultType = "application/json";
                  if(ctp.indexOf("application/json")>=0){
                    defaultType=ctp;
                  }
                  swpinfo.contentMode = "json";
                  break;
                }
              } else {
                if (pt.schemaValue == "MultipartFile") {
                  defaultType = "multipart/form-data";
                  defaultValue = "form-data";
                  break;
                }
              }
            }
            swpinfo.contentType = defaultType;
            swpinfo.contentValue = defaultValue;
          }else{
             //如果开发者有指明consumes，则默认取开发者的
            if(ctp.indexOf("application/json")>=0){
              swpinfo.contentType = ctp;
              swpinfo.contentValue = "raw";
              swpinfo.contentShowValue = "JSON(application/json)";
              swpinfo.contentMode = "json";
            }else{
              swpinfo.contentType = ctp;
              swpinfo.contentValue = defaultValue;
            }
          }
        }
      } else {
        //根据参数遍历,否则默认是表单x-www-form-urlencoded类型
        var defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
        var defaultValue = "x-www-form-urlencoded";
        for (var i = 0; i < swpinfo.parameters.length; i++) {
          var pt = swpinfo.parameters[i];
          if (pt.in == "body") {
            if (pt.schemaValue == "MultipartFile") {
              defaultType = "multipart/form-data";
              defaultValue = "form-data";
              break;
            } else {
              defaultValue = "raw";
              defaultType = "application/json";
              swpinfo.contentMode = "json";
              break;
            }
          } else {
            if (pt.schemaValue == "MultipartFile") {
              defaultType = "multipart/form-data";
              defaultValue = "form-data";
              break;
            }
          }
        }
        swpinfo.contentType = defaultType;
        swpinfo.contentValue = defaultValue;
      }
    }
    swpinfo.init=true;
    //console.log("异步初始化ApiInfo完成")
    //console.log(swpinfo);
  }
}

/**
 * 解析OAS3的接口
 * @param {*} swpinfo
 */
SwaggerBootstrapUi.prototype.initApiInfoAsyncOAS3=function(swpinfo){
  var that=this;
  var apiInfo=swpinfo.originalApiInfo;
  if(!swpinfo.init){
    //如果当前对象未初始化,进行初始化
    if (apiInfo.hasOwnProperty("parameters")) {
      var pameters = apiInfo["parameters"];
      pameters.forEach(function (m) {
        //})
        //$.each(pameters, function (i, m) {
        var originalName = KUtils.propValue("name", m, "");
        var inType = KUtils.propValue("in", m, "");
        //忽略参数
        //if (swpinfo.ignoreParameters == null || (swpinfo.ignoreParameters != null && !swpinfo.ignoreParameters.hasOwnProperty(originalName))) {
        //暂时放弃增加includeParameters的新特性支持
        //if (KUtils.filterIncludeParameters(inType, originalName, swpinfo.includeParameters)) {
        if(swpinfo.includeParameters!=null){
          //直接判断include的参数即可
          if (KUtils.filterIncludeParameters(inType, originalName, swpinfo.includeParameters)) {
            that.assembleParameterOAS3(m,swpinfo,[]);
          }
        }else{
          if (KUtils.filterIgnoreParameters(inType, originalName, swpinfo.ignoreParameters)) {
            that.assembleParameterOAS3(m,swpinfo,[]);
          }
        }

        //}
      })
    }
    //判断是否包含requestBody
    if(apiInfo.hasOwnProperty("requestBody")){
      var bodyParameter=apiInfo["requestBody"];
      if(KUtils.checkUndefined(bodyParameter)){
        if(bodyParameter.hasOwnProperty("content")&&KUtils.checkUndefined(bodyParameter["content"])){
          var bodyContent=bodyParameter["content"];
          for(var consume in bodyContent){
            var consumeBody=bodyContent[consume];
            if(KUtils.checkUndefined(consumeBody)&&consumeBody.hasOwnProperty("schema")){
              //判断是否包含schema
              var schema=consumeBody["schema"];
              if(KUtils.arrNotEmpty(swpinfo.consumes)){
                if(!swpinfo.consumes.includes(consume)){
                  swpinfo.consumes.push(consume);
                }
              }else{
                var _defaultConsumeArr=[];
                _defaultConsumeArr.push(consume);
                swpinfo.consumes=_defaultConsumeArr;
              }
              //此处判断properties,如果有properties,说明有属性,非ref
              if(schema.hasOwnProperty("properties")&&KUtils.checkUndefined(schema["properties"])){
                //有值,此处可能是application/x-www-form-urlencoded的请求类型
                var requestProperties=schema["properties"];
                var requireArray=[];
                if(schema.hasOwnProperty("required")&&KUtils.checkUndefined(schema["required"])){
                  requireArray=schema["required"];
                }
                for(var prop in requestProperties){
                  var parameterInfo=requestProperties[prop];
                  parameterInfo["name"]=prop;
                  parameterInfo["in"]="query";
                  that.assembleParameterOAS3(parameterInfo,swpinfo,requireArray);
                }
              }else{
                //此处有可能是array类型
                var arrFlag=that.getSwaggerModelRefArray(schema,swpinfo.oas2);
                var type=that.getSwaggerModelRefType(schema,swpinfo.oas2);
                if(KUtils.checkUndefined(type)){
                  //在此处构造openAPI2.0的结构,复用原来的解析方法
                  var originalSchema=null;
                  var originalParameterName=KUtils.camelCase(type);
                  if(arrFlag){
                    originalSchema={
                      "type":"array",
                      "items":{
                        "originalRef":type,
                        "$ref":"#/components/schemas/"+type
                      }
                    }
                    originalParameterName=originalParameterName+"s";
                  }else{
                    originalSchema={
                      "originalRef":type,
                      "$ref":"#/components/schemas/"+type
                    }
                  }
                  var originalOpenApiParameter={
                    "in":"body",
                    "description":type,
                    "name":originalParameterName,
                    "required":true,
                    "schema":originalSchema
                  };
                  that.assembleParameterOAS3(originalOpenApiParameter,swpinfo,[]);

                  //此时，创建请求参数
                  /* var minfo = new SwaggerBootstrapUiParameter();
                  minfo.name = type;
                  minfo.type = type;
                  minfo.in = "body";
                  minfo.require = true;
                  minfo.description = KUtils.replaceMultipLineStr(KUtils.propValue("description", schema, ""));
                  var _format = KUtils.propValue("format", schema, "");
                  if (KUtils.strNotBlank(_format)) {
                    //存在format
                    var _rtype = minfo.type + "(" + _format + ")";
                    minfo.type = _rtype;
                  }
                  if(arrFlag){
                    minfo.type="array";
                  }
                  //存在schema属性,请求对象是实体类
                  minfo.schema = true;
                  minfo.schemaValue = type;
                  var def = that.getDefinitionByName(type,swpinfo.oas2);
                  if (def != null) {
                    minfo.def = def;
                    minfo.value = def.value;
                    if (def.description != undefined && def.description != null && def.description != "") {
                      minfo.description = KUtils.replaceMultipLineStr(def.description);
                    }
                  } else {
                    //此处判断Array的类型,如果
                    if (type == "string") {
                      minfo.value = "";
                    }
                    if (type == "integer") {
                      //判断format
                      if (schema["format"] != undefined && schema["format"] != null && schema["format"] == "int32") {
                        minfo.value = 0;
                      } else {
                        minfo.value = 1054661322597744642;
                      }
                    }
                    if (type == "number") {
                      if (schema["format"] != undefined && schema["format"] != null && schema["format"] == "double") {
                        minfo.value = 0.5;
                      } else {
                        minfo.value = 0;
                      }
                    }
                  }
                  if (!KUtils.checkParamArrsExists(swpinfo.parameters, minfo)) {
                    swpinfo.parameters.push(minfo);
                    //判断当前属性是否是schema
                    if (minfo.schema) {
                      minfo.parentTypes.push(minfo.schemaValue);
                    }
                  } */
                }
              }
            }
          }
          //判断是否xml请求,openapiv3中没有consumes，此处也只能强加一个判断
          if(KUtils.arrNotEmpty(swpinfo.consumes)){
            var xmlConsume=swpinfo.consumes.filter(consume=> consume.indexOf("xml")>-1);
            if(KUtils.arrNotEmpty(xmlConsume)){
              swpinfo.consumes=["application/xml"];
            }
          }
        }
      }

    }
    var definitionType = null;
    var arr = false;
    //解析responsecode
    if (typeof (apiInfo.responses) != 'undefined' && apiInfo.responses != null) {
      var resp = apiInfo.responses;
      var rpcount = 0;
      for (var status in resp) {
        var swaggerResp = new SwaggerBootstrapUiResponseCode();
        var rescrobj = resp[status];
        swaggerResp.oas2=swpinfo.oas2;
        swaggerResp.code = status;
        swaggerResp.description = rescrobj["description"];
        var rptype = null;
        //3.0判断content
        if(rescrobj.hasOwnProperty("content")&&KUtils.checkUndefined(rescrobj["content"])){
          var content=rescrobj["content"];
          for(var ckey in content){
            var respContentProduces=content[ckey];
            if(respContentProduces.hasOwnProperty("schema")&&KUtils.checkUndefined(respContentProduces["schema"])){
              var schema = respContentProduces["schema"];
              //单引用类型
              //判断是否是数组类型
              //var regex = new RegExp("#/definitions/(.*)$", "ig");
              var regex = new RegExp(KUtils.oasmodel(swpinfo.oas2), "ig");
              if (schema.hasOwnProperty("$ref")) {
                if (regex.test(schema["$ref"])) {
                  var ptype = RegExp.$1;
                  swpinfo.responseParameterRefName = ptype;
                  swaggerResp.responseParameterRefName = ptype;
                  definitionType = ptype;
                  rptype = ptype;
                  swaggerResp.schema = ptype;
                }
              } else if (schema.hasOwnProperty("type")) {
                var t = schema["type"];
                if (t == "array") {
                  arr = true;
                  if (schema.hasOwnProperty("items")) {
                    var items = schema["items"];
                    var itref = items["$ref"];
                    //此处需判断items是否数组
                    if (items.hasOwnProperty("type")) {
                      if (items["type"] == "array") {
                        itref = items["items"]["$ref"];
                      }
                    }
                    if (regex.test(itref)) {
                      var ptype = RegExp.$1;
                      swpinfo.responseParameterRefName = ptype;
                      swaggerResp.responseParameterRefName = ptype;
                      definitionType = ptype;
                      rptype = ptype;
                      swaggerResp.schema = ptype;
                    }
                  }
                } else {
                  //判断是否存在properties属性
                  if (schema.hasOwnProperty("properties")) {
                    swaggerResp.schema = t;
                    //自定义类型、放入difarrs对象中
                    var swud = new SwaggerBootstrapUiDefinition();
                    swud.name = swpinfo.id;
                    swud.description = "自定义Schema";
                    definitionType = swud.name;
                    rptype = swud.name;
                    swaggerResp.responseParameterRefName = swud.name;

                    var properties = schema["properties"];
                    var defiTypeValue = {};
                    for (var property in properties) {
                      var spropObj = new SwaggerBootstrapUiProperty();
                      spropObj.name = property;
                      var propobj = properties[property];
                      spropObj.originProperty = propobj;
                      spropObj.type = KUtils.propValue("type", propobj, "string");
                      spropObj.description = KUtils.propValue("description", propobj, "");
                      spropObj.example = KUtils.propValue("example", propobj, "");
                      spropObj.format = KUtils.propValue("format", propobj, "");
                      spropObj.required = KUtils.propValue("required", propobj, false);
                      if (swud.required.length > 0) {
                        //有required属性,需要再判断一次
                        //if ($.inArray(spropObj.name, swud.required) > -1) {
                        if (swud.required.includes(spropObj.name)) {
                          //存在
                          spropObj.required = true;
                        }
                      }
                      //默认string类型
                      var propValue = "";
                      //判断是否有类型
                      if (propobj.hasOwnProperty("type")) {
                        var type = propobj["type"];
                        //判断是否有example
                        if (propobj.hasOwnProperty("example")) {
                          if (type == "string") {
                            propValue = String(KUtils.propValue("example", propobj, ""));
                          } else {
                            propValue = propobj["example"];
                          }
                        } else if (KUtils.checkIsBasicType(type)) {
                          propValue = KUtils.getBasicTypeValue(type);
                        }

                      }
                      spropObj.value = propValue;
                      //判断是否有format,如果是integer,判断是64位还是32位
                      if (spropObj.format != null && spropObj.format != undefined && spropObj.format != "") {
                        //spropObj.type=spropObj.format;
                        spropObj.type += "(" + spropObj.format + ")";
                      }
                      swud.properties.push(spropObj);
                      defiTypeValue[property] = propValue;
                    }
                    swud.value = defiTypeValue;
                    swud.init=true;
                    that.currentInstance.difArrs.push(swud);
                  } else {
                    //判断是否是基础类型
                    if (KUtils.checkIsBasicType(t)) {
                      //基础类型
                      swpinfo.responseText = t;
                      swpinfo.responseBasicType = true;

                      //响应状态码的响应内容
                      swaggerResp.responseText = t;
                      swaggerResp.responseBasicType = true;
                    }
                  }
                }
              }
            }
            break;
          }
        }
        if (rescrobj.hasOwnProperty("schema")&&KUtils.checkUndefined(rescrobj["schema"])) {
          var schema = rescrobj["schema"];

        }
        if (rptype != null) {
          //查询
          //响应参数
          var def = that.getDefinitionByName(rptype,swpinfo.oas2);
          if (def != null) {
            if (arr) {
              var na = new Array();
              na.push(def.value);
              //swaggerResp.responseValue = JSON.stringify(na, null, "\t");
              swaggerResp.responseValue = KUtils.json5stringifyFormat(na, null, "\t");
              swaggerResp.responseJson = na;
            } else {
              //swaggerResp.responseValue = JSON.stringify(def.value, null, "\t");
              swaggerResp.responseValue = KUtils.json5stringifyFormat(def.value, null, "\t");
              swaggerResp.responseJson = def.value;
            }
            if (def.hasOwnProperty("properties")) {
              var props = def["properties"];
              props.forEach(function (p) {
                //})
                //$.each(props, function (i, p) {
                var resParam = new SwaggerBootstrapUiParameter();
                resParam.name = p.name;
                if (!KUtils.checkParamArrsExists(swaggerResp.responseParameters, resParam)) {
                  swaggerResp.responseParameters.push(resParam);
                  resParam.description = KUtils.replaceMultipLineStr(p.description);
                  if (p.type == null || p.type == "") {
                    if (p.refType != null) {
                      if (!KUtils.checkIsBasicType(p.refType)) {
                        resParam.schemaValue = p.refType;
                        resParam.schema = true;
                        //存在引用类型,修改默认type
                        resParam.type = p.refType;
                        var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                        deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        resParam.parentTypes.push(p.refType);
                        deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                      }
                    }
                  } else {
                    resParam.type = p.type;
                    if (!KUtils.checkIsBasicType(p.type)) {
                      if (p.refType != null) {
                        if (!KUtils.checkIsBasicType(p.refType)) {
                          resParam.schemaValue = p.refType;
                          resParam.schema = true;
                          //存在引用类型,修改默认type
                          if (p.type != "array") {
                            resParam.type = p.refType;
                          }
                          var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                          deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                          resParam.parentTypes.push(p.refType);
                          deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        }
                      } else {
                        resParam.schemaValue = p.type;
                        resParam.schema = true;
                        //存在引用类型,修改默认type
                        resParam.type = p.type;
                        var deepDef = that.getDefinitionByName(p.type,swpinfo.oas2);
                        deepResponseRefParameter(swaggerResp, that, deepDef, resParam);
                        resParam.parentTypes.push(p.type);
                        deepTreeTableResponseRefParameter(swaggerResp, that, deepDef, resParam);
                      }
                    }
                  }
                }
              })

            }
          }
        }

        if (swaggerResp.schema != null && swaggerResp.schema != undefined) {
          rpcount = rpcount + 1;
        }
        //判断是否有响应headers
        if (rescrobj.hasOwnProperty("headers")) {
          var _headers = rescrobj["headers"];
          swaggerResp.responseHeaderParameters = new Array();
          for (var _headerN in _headers) {
            var _hv = {
              ..._headers[_headerN],
              name: _headerN,
              id: md5(_headerN),
              pid: "-1"
            }
            /*
            var _hv = $.extend({}, _headers[_headerN], {
              name: _headerN,
              id: md5(_headerN),
              pid: "-1"
            }); */
            swaggerResp.responseHeaderParameters.push(_hv);
          }
          if (status == "200") {
            swpinfo.responseHeaderParameters = swaggerResp.responseHeaderParameters;
          }
        }
        swpinfo.responseCodes.push(swaggerResp);
      }
      swpinfo.multipartResponseSchemaCount = rpcount;
      if (rpcount > 1) {
        swpinfo.multipartResponseSchema = true;
      }
    }

    if (definitionType != null && !swpinfo.multipartResponseSchema) {
      //查询
      for (var i = 0; i < that.currentInstance.difArrs.length; i++) {
        var ref = that.currentInstance.difArrs[i];
        if (ref.name == definitionType) {
          if(!ref.init){
            //如果该类没有加载,则进行加载
            that.analysisDefinitionAsync(that.currentInstance.swaggerData,ref);
          }
          if (arr) {
            var na = new Array();
            na.push(ref.value);
            //swpinfo.responseValue = JSON.stringify(na, null, "\t");
            swpinfo.responseValue = KUtils.json5stringifyFormat(na, null, "\t");
            swpinfo.responseJson = na;
          } else {
            //swpinfo.responseValue = JSON.stringify(ref.value, null, "\t");
            swpinfo.responseValue = KUtils.json5stringifyFormat(ref.value, null, "\t");
            swpinfo.responseJson = ref.value;
          }
        }
      }
      //响应参数
      var def = that.getDefinitionByName(definitionType,swpinfo.oas2);
      if (def != null) {
        if (def.hasOwnProperty("properties")) {
          var props = def["properties"];
          props.forEach(function (p) {
            //})
            //$.each(props, function (i, p) {
            var resParam = new SwaggerBootstrapUiParameter();
            resParam.name = p.name;
            if (!KUtils.checkParamArrsExists(swpinfo.responseParameters, resParam)) {
              swpinfo.responseParameters.push(resParam);
              resParam.description = KUtils.replaceMultipLineStr(p.description);
              if (p.type == null || p.type == "") {
                if (p.refType != null) {
                  if (!KUtils.checkIsBasicType(p.refType)) {
                    resParam.schemaValue = p.refType;
                    resParam.schema = true;
                    //存在引用类型,修改默认type
                    resParam.type = p.refType;
                    var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                    deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                    resParam.parentTypes.push(p.refType);
                    deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                  }
                }
              } else {
                resParam.type = p.type;
                if (!KUtils.checkIsBasicType(p.type)) {
                  if (p.refType != null) {
                    if (!KUtils.checkIsBasicType(p.refType)) {
                      resParam.schemaValue = p.refType;
                      //存在引用类型,修改默认type
                      if (p.type != "array") {
                        resParam.type = p.refType;
                      }
                      var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                      deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                      resParam.parentTypes.push(p.refType);
                      deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                    }
                  } else {
                    resParam.schemaValue = p.type;
                    //存在引用类型,修改默认type
                    resParam.type = p.type;
                    var deepDef = that.getDefinitionByName(p.type,swpinfo.oas2);
                    deepResponseRefParameter(swpinfo, that, deepDef, resParam);
                    resParam.parentTypes.push(p.type);
                    deepTreeTableResponseRefParameter(swpinfo, that, deepDef, resParam);
                  }
                }
              }
            }
          })

        }
      }

    }
      //获取请求json
    //统计body次数
    if (swpinfo.parameters != null) {
      var count = 0;
      var tmpJsonValue = null;
      var tmpRootXmlName = "";
      swpinfo.parameters.forEach(function (p) {
        //})
        //$.each(swpinfo.parameters, function (i, p) {
        if (p.in == "body") {
          count = count + 1;
          if (p.txtValue != null && p.txtValue != "") {
            tmpJsonValue = p.txtValue;
            tmpRootXmlName = p.schemaValue;
          }
        }
      })
      if (count == 1) {
        swpinfo.requestValue = tmpJsonValue;
        //判断consume是否是XML
        //https://gitee.com/xiaoym/knife4j/issues/I1BCKB
        if (KUtils.arrNotEmpty(swpinfo.consumes)) {
          var notEmptyConsumes = swpinfo.consumes.filter(consume => KUtils.strNotBlank(consume));
          if (KUtils.arrNotEmpty(notEmptyConsumes)) {
            var xmlRequest = notEmptyConsumes.some(consume => consume.toLowerCase().indexOf("xml") > -1);
            if (xmlRequest) {
              //是Xml请求
              if (KUtils.strNotBlank(tmpJsonValue)) {
                var tmpJsonObject = KUtils.json5parse(tmpJsonValue);
                var builder = new xml2js.Builder({
                  rootName: tmpRootXmlName
                });
                var obj = builder.buildObject(tmpJsonObject);
                swpinfo.requestValue = builder.buildObject(tmpJsonObject);
                swpinfo.xmlRequest = true;
              }
            }

          }
        }
      }
      //此处判断接口的请求参数类型
      //判断consumes请求类型
      if (swpinfo.consumes != undefined && swpinfo.consumes != null && swpinfo.consumes.length > 0) {
        var ctp = swpinfo.consumes[0];
        //if (ctp == "multipart/form-data") {
          //console.log("consumes:"+ctp)
        if (ctp.indexOf("multipart/form-data")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "form-data";
        } else if (ctp.indexOf("text/plain")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "raw";
          swpinfo.contentShowValue = "Text(text/plain)";
          swpinfo.contentMode = "text";
        } else if (ctp.indexOf("application/xml")>=0) {
          swpinfo.contentType = ctp;
          swpinfo.contentValue = "raw";
          swpinfo.contentShowValue = "XML(application/xml)";
          swpinfo.contentMode = "xml";
        }else {
          //根据参数遍历,否则默认是表单x-www-form-urlencoded类型
          var defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
          var defaultValue = "x-www-form-urlencoded";
          //解决springfox的默认bug，存在form参数，接口consumes却是json请求类型
          if(KUtils.arrNotEmpty(swpinfo.parameters)){
            //参数不为空,从参数判断
            for (var i = 0; i < swpinfo.parameters.length; i++) {
              var pt = swpinfo.parameters[i];
              if (pt.in == "body") {
                if (pt.schemaValue == "MultipartFile") {
                  defaultType = "multipart/form-data";
                  defaultValue = "form-data";
                  break;
                } else {
                  defaultValue = "raw";
                  defaultType = "application/json";
                  if(ctp.indexOf("application/json")>=0){
                    defaultType=ctp;
                  }
                  swpinfo.contentMode = "json";
                  break;
                }
              } else {
                if (pt.schemaValue == "MultipartFile") {
                  defaultType = "multipart/form-data";
                  defaultValue = "form-data";
                  break;
                }
              }
            }
            swpinfo.contentType = defaultType;
            swpinfo.contentValue = defaultValue;
          }else{
             //如果开发者有指明consumes，则默认取开发者的
            if(ctp.indexOf("application/json")>=0){
              swpinfo.contentType = ctp;
              swpinfo.contentValue = "raw";
              swpinfo.contentShowValue = "JSON(application/json)";
              swpinfo.contentMode = "json";
            }else{
              swpinfo.contentType = ctp;
              swpinfo.contentValue = defaultValue;
            }
          }
        }
      } else {
        //根据参数遍历,否则默认是表单x-www-form-urlencoded类型
        var defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
        var defaultValue = "x-www-form-urlencoded";
        for (var i = 0; i < swpinfo.parameters.length; i++) {
          var pt = swpinfo.parameters[i];
          if (pt.in == "body") {
            if (pt.schemaValue == "MultipartFile") {
              defaultType = "multipart/form-data";
              defaultValue = "form-data";
              break;
            } else {
              defaultValue = "raw";
              defaultType = "application/json";
              swpinfo.contentMode = "json";
              break;
            }
          } else {
            if (pt.schemaValue == "MultipartFile") {
              defaultType = "multipart/form-data";
              defaultValue = "form-data";
              break;
            }
          }
        }
        swpinfo.contentType = defaultType;
        swpinfo.contentValue = defaultValue;
      }
    }
    swpinfo.init=true;
    //console.log("异步初始化ApiInfo完成")
    //console.log(swpinfo);
  }
}
/***
 * 创建对象实例,返回SwaggerBootstrapUiApiInfo实例
 */
SwaggerBootstrapUi.prototype.createApiInfoInstance = function (path, mtype, apiInfo) {
  var that = this;

  var swpinfo = new SwaggerBootstrapUiApiInfo();
  //给接口增加一个版本属性
  if(that.currentInstance.oas2()){
    swpinfo.oas2=true;
  }else{
    swpinfo.oas2=false;
  }
  //原始对象赋值,作为二次异步解析
  swpinfo.originalApiInfo=apiInfo;
  //添加basePath
  var basePath = that.currentInstance.basePath;
  //此处标注host是因为host中可能存在basePath的情况
  //例如,Host:http://192.168.0.1:8080/abc ?
  //var newfullPath = that.currentInstance.host;
  var newfullPath = "";
  var basePathFlag = false;
  //basePath="/addd/";
  if (basePath != "" && basePath != "/") {
    newfullPath += basePath;
    //如果非空,非根目录
    basePathFlag = true;
  }
  newfullPath += path;
  //截取字符串
  //var newurl = newfullPath.substring(newfullPath.indexOf("/"));
  //that.log("新的url:"+newurl)
  //newurl = newurl.replace("//", "/");
  var newurl=newfullPath;
  //判断应用实例的baseurl
  /* if (that.currentInstance.baseUrl != "" && that.currentInstance.baseUrl != "/") {
    newurl = that.currentInstance.baseUrl + newurl;
  } */
  var startApiTime = new Date().getTime();
  swpinfo.showUrl = newurl;
  //swpinfo.id="ApiInfo"+Math.round(Math.random()*1000000);
  swpinfo.instanceId = that.currentInstance.id;
  swpinfo.host = that.currentInstance.host;

  swpinfo.url = newurl;
  swpinfo.originalUrl = newurl;

  //new --> https://github.com/xiaoymin/swagger-bootstrap-ui/pull/108
  /*var urlForRealUsage=newurl.replace(/^([^{]+).*$/g, '$1');
  swpinfo.url=urlForRealUsage;
  swpinfo.originalUrl=urlForRealUsage;*/
  swpinfo.basePathFlag = basePathFlag;
  swpinfo.methodType = mtype.toUpperCase();
  //add by xiaoymin 2020-3-11 20:34:39
  // 判断当前接口是否支持调试
  if (KUtils.checkUndefined(that.configuration.supportedSubmitMethods)) {
    if (!that.configuration.supportedSubmitMethods.includes(mtype.toLowerCase())) {
      swpinfo.configurationDebugSupport = false;
    }
  }
  //接口id使用MD5策略,缓存整个调试参数到localStorage对象中,供二次调用
  var md5Str = newurl + mtype.toUpperCase();
  swpinfo.id = md5(md5Str);
  swpinfo.versionId = KUtils.md5Id(apiInfo);
  if (apiInfo != null) {
    if (apiInfo.hasOwnProperty("deprecated")) {
      swpinfo.deprecated = apiInfo["deprecated"];
    }
    if (!apiInfo.tags) {
      apiInfo.tags = ['default'];
    }
    //swpinfo.consumes = apiInfo.consumes;
    swpinfo.consumes = KUtils.getValue(apiInfo,"consumes",[].concat("application/x-www-form-urlencoded"),true);
    swpinfo.description = KUtils.getValue(apiInfo, "description", "", true);
    //描述支持markdown
    if(KUtils.strNotBlank(swpinfo.description)){
      swpinfo.description=marked(swpinfo.description);
    }
    swpinfo.operationId = apiInfo.operationId;
    swpinfo.summary = KUtils.toString(apiInfo.summary,"").replace(/\//g,"-");
    swpinfo.tags = apiInfo.tags;
    //读取扩展属性
    this.readApiInfoInstanceExt(swpinfo,apiInfo);
    //operationId
    swpinfo.operationId = KUtils.getValue(apiInfo, "operationId", "", true);
    var _groupName = that.currentInstance.name;
    //设置hashurl
    swpinfo.tags.forEach(function (tag) {
      var _hashUrl = "#/" + _groupName + "/" + tag + "/" + swpinfo.operationId;
      swpinfo.hashCollections.push(_hashUrl);
    })
    if(KUtils.checkUndefined(apiInfo.produces)){
      swpinfo.produces = apiInfo.produces;
    }else{
      swpinfo.produces = [].concat("*/*");
    }
    //swpinfo.produces = KUtils.getValue(apiInfo,"produces","[\"*/*\"]",true);
    //二次解析截取start

    //二次解析截取end
    //that.currentInstance.paths.push(swpinfo);
    for (var i = 0; i < apiInfo.tags.length; i++) {
      var tagName = apiInfo.tags[i];
      that.mergeApiInfoSelfTags(tagName);
    }
  }
  //二次截取判断start

  //二次截取判断end
  //第一次加载
  if (that.currentInstance.firstLoad) {
    that.currentInstance.cacheInstance.cacheApis.push(swpinfo.id);
    //that.currentInstance.groupApis.push(swpinfo.id);
    //构建当前版本对象
    var _uptObject = new SwaggerBootstrapUiCacheUptApi(swpinfo.versionId);
    _uptObject.url = swpinfo.url;
    that.currentInstance.cacheInstance.updateApis[swpinfo.id] = _uptObject;
    //that.log(that.currentInstance)
  } else {
    //判断当前是否接口信息有变更,兼容赏上个版本的缓存
    var _cacheUa = that.currentInstance.cacheInstance.updateApis;
    if (_cacheUa.hasOwnProperty(swpinfo.id)) {
      var _uptInfo = _cacheUa[swpinfo.id];
      if (_uptInfo != null && _uptInfo != undefined) {
        if (_uptInfo.versionId != swpinfo.versionId) {
          //已经存在变更
          swpinfo.hasChanged = true;
        }
      }
    } else {
      //构建当前版本对象
      var _uptObject = new SwaggerBootstrapUiCacheUptApi(swpinfo.versionId);
      _uptObject.url = swpinfo.url;
      that.currentInstance.cacheInstance.updateApis[swpinfo.id] = _uptObject;
      that.log(that.currentInstance.cacheInstance)
    }
  }
  return swpinfo;
}

/**
 * 读取API接口的扩展属性
 * @param {*} swpinfo
 * @param {*} apiInfo
 */
SwaggerBootstrapUi.prototype.readApiInfoInstanceExt=function(swpinfo,apiInfo){
  if(swpinfo.oas2){
    this.readApiInfoInstanceExtOAS2(swpinfo,apiInfo);
  }else{
    this.readApiInfoInstanceExtOAS3(swpinfo,apiInfo);
  }
}
/**
 * OAS2.0
 * @param {} swpinfo
 * @param {*} apiInfo
 */
SwaggerBootstrapUi.prototype.readApiInfoInstanceExtOAS2=function(swpinfo,apiInfo){
  //读取扩展属性x-ignoreParameters
  if (apiInfo.hasOwnProperty("x-ignoreParameters")) {
    var ignoArr = apiInfo["x-ignoreParameters"];
    //忽略参数对象
    swpinfo.ignoreParameters = ignoArr[0];
  }
  //读取扩展属性x-includeParameters
  if (apiInfo.hasOwnProperty("x-includeParameters")) {
    var includeArr = apiInfo["x-includeParameters"];
    //包含参数
    swpinfo.includeParameters = includeArr[0];
  }
  //读取扩展属性x-order值
  if (apiInfo.hasOwnProperty("x-order")) {
    swpinfo.order = parseInt(apiInfo["x-order"]);
  }
  //读取扩展属性x-author
  if (apiInfo.hasOwnProperty("x-author")) {
    var xauthor = apiInfo["x-author"];
    if (KUtils.strNotBlank(xauthor)) {
      swpinfo.author = xauthor;
    }
  }
}

/**
 * OAS3.0
 * @param {*} swpinfo
 * @param {*} apiInfo
 */
SwaggerBootstrapUi.prototype.readApiInfoInstanceExtOAS3=function(swpinfo,apiInfo){
  //获取扩展属性
  if(apiInfo.hasOwnProperty("extensions")&&KUtils.checkUndefined(apiInfo["extensions"])){
    var extensions=apiInfo["extensions"];
    //读取扩展属性x-ignoreParameters
    if (extensions.hasOwnProperty("x-ignoreParameters")) {
      var ignoArr = extensions["x-ignoreParameters"];
      //忽略参数对象
      swpinfo.ignoreParameters = ignoArr[0];
    }
    //读取扩展属性x-includeParameters
    if (extensions.hasOwnProperty("x-includeParameters")) {
      var includeArr = extensions["x-includeParameters"];
      //包含参数
      swpinfo.includeParameters = includeArr[0];
    }
    //读取扩展属性x-order值
    if (extensions.hasOwnProperty("x-order")) {
      swpinfo.order = parseInt(extensions["x-order"]);
    }
    //读取扩展属性x-author
    if (extensions.hasOwnProperty("x-author")) {
      var xauthor = extensions["x-author"];
      if (KUtils.strNotBlank(xauthor)) {
        swpinfo.author = xauthor;
      }
    }
  }
}

/**
 * 处理Open API v2的请求参数，获取SwaggerBootstrapUiParameter的对象
 * @param m 原始parameter参数
 * @param swpinfo knife4j 创建的API对象
 */
SwaggerBootstrapUi.prototype.assembleParameter=function(m,swpinfo){
  var that=this;
  var originalName = KUtils.propValue("name", m, "");
  var inType = KUtils.propValue("in", m, "");
  var minfo = new SwaggerBootstrapUiParameter();
  minfo.name = originalName;
  minfo.ignoreFilterName = originalName;
  minfo.type = KUtils.propValue("type", m, "");
  minfo.in = inType;
  minfo.require = KUtils.propValue("required", m, false);
  minfo.description = KUtils.replaceMultipLineStr(KUtils.propValue("description", m, ""));
  //add at 2019-12-10 09:20:08  判断请求参数类型是否包含format
  //https://github.com/xiaoymin/swagger-bootstrap-ui/issues/161
  var _format = KUtils.propValue("format", m, "");
  if (KUtils.strNotBlank(_format)) {
    //存在format
    var _rtype = minfo.type + "(" + _format + ")";
    minfo.type = _rtype;
  }
  //判断是否有枚举类型
  if (m.hasOwnProperty("enum")) {
    //that.log("包括枚举类型...")
    //that.log(m.enum);
    minfo.enum = m.enum;
    //that.log(minfo);
    //枚举类型,描述显示可用值
    var avaiableArrStr = m.enum.join(",");
    if (m.description != null && m.description != undefined && m.description != "") {
      minfo.description = m.description + ",可用值:" + avaiableArrStr;
    } else {
      minfo.description = "枚举类型,可用值:" + avaiableArrStr;
    }

  }
  //判断你是否有默认值(后台)
  if (m.hasOwnProperty("default")) {
    minfo.txtValue = m["default"];
  }
  //swagger 2.9.2版本默认值响应X-EXAMPLE的值为2.9.2
  if (m.hasOwnProperty("x-example")) {
    minfo.txtValue = m["x-example"];
    if(KUtils.checkUndefined(minfo.txtValue)){
      minfo.example=minfo.txtValue;
    }
  }
  if (m.hasOwnProperty("schema")) {
    //存在schema属性,请求对象是实体类
    minfo.schema = true;
    var schemaObject = m["schema"];
    var schemaType = schemaObject["type"];
    if (schemaType == "array") {
      minfo.type = schemaType;
      var schItem = schemaObject["items"];
      var ref = schItem["$ref"];
      var className = KUtils.getClassName(ref,swpinfo.oas2);
      minfo.schemaValue = className;
      var def = that.getDefinitionByName(className,swpinfo.oas2);
      if (def != null) {
        minfo.def = def;
        minfo.value = def.value;
        if (def.description != undefined && def.description != null && def.description != "") {
          minfo.description = KUtils.replaceMultipLineStr(def.description);
        }
      } else {
        var sty = schItem["type"];
        minfo.schemaValue = schItem["type"]
        //此处判断Array的类型,如果
        if (sty == "string") {
          minfo.value = "";
        }
        if (sty == "integer") {
          //判断format
          if (schItem["format"] != undefined && schItem["format"] != null && schItem["format"] == "int32") {
            minfo.value = 0;
          } else {
            minfo.value = 1054661322597744642;
          }
        }
        if (sty == "number") {
          if (schItem["format"] != undefined && schItem["format"] != null && schItem["format"] == "double") {
            minfo.value = 0.5;
          } else {
            minfo.value = 0;
          }
        }
      }
    } else {
      if (schemaObject.hasOwnProperty("$ref")) {
        var ref = m["schema"]["$ref"];
        var className = KUtils.getClassName(ref,swpinfo.oas2);
        if (minfo.type != "array") {
          minfo.type = className;
        }
        minfo.schemaValue = className;
        var def = that.getDefinitionByName(className,swpinfo.oas2);
        if (def != null) {
          minfo.def = def;
          minfo.value = def.value;
          if (def.description != undefined && def.description != null && def.description != "") {
            minfo.description = KUtils.replaceMultipLineStr(def.description);
          }
        }
      } else {
        //判断是否包含addtionalProperties属性
        if (schemaObject.hasOwnProperty("additionalProperties")) {
          //判断是否是数组
          var addProp = schemaObject["additionalProperties"];
          if (addProp.hasOwnProperty("$ref")) {
            //object
            var className = KUtils.getClassName(addProp["$ref"],swpinfo.oas2);
            if (className != null) {
              var def = that.getDefinitionByName(className,swpinfo.oas2);
              if (def != null) {
                minfo.def = def;
                minfo.value = {
                  "additionalProperties1": def.value
                };
                if (def.description != undefined && def.description != null && def.description != "") {
                  minfo.description = KUtils.replaceMultipLineStr(def.description);
                }
              }
            }
          } else if (addProp.hasOwnProperty("items")) {
            //数组
            var addItems = addProp["items"];
            var className = KUtils.getClassName(addItems["$ref"],swpinfo.oas2);
            if (className != null) {
              var def = that.getDefinitionByName(className,swpinfo.oas2);
              if (def != null) {
                var addArrValue = new Array();
                addArrValue.push(def.value)
                minfo.def = def;
                minfo.value = {
                  "additionalProperties1": addArrValue
                };
                if (def.description != undefined && def.description != null && def.description != "") {
                  minfo.description = KUtils.replaceMultipLineStr(def.description);
                }
              }
            }

          }


        } else {
          if (schemaObject.hasOwnProperty("type")) {
            minfo.type = schemaObject["type"];
          }
          minfo.value = "";
        }
      }
    }
  }
  if (m.hasOwnProperty("items")) {
    var items = m["items"];
    if (items.hasOwnProperty("$ref")) {
      var ref = items["$ref"];
      var className = KUtils.getClassName(ref,swpinfo.oas2);
      //minfo.type=className;
      minfo.schemaValue = className;
      var def = that.getDefinitionByName(className,swpinfo.oas2);
      if (def != null) {
        minfo.def = def;
        minfo.value = def.value;
        if (def.description != undefined && def.description != null && def.description != "") {
          minfo.description = KUtils.replaceMultipLineStr(def.description);
        }
      }
    } else {
      if (items.hasOwnProperty("type")) {
        //minfo.type=items["type"];
        minfo.schemaValue = items["type"];
      }
      minfo.value = "";
    }
  }

  if (minfo.in == 'body') {
    if (isUndefined(minfo.txtValue) || isNull(minfo.txtValue)) {
      // ********************************************************************
      // 改造参数过滤规则，新的规则支持数组嵌套过滤，参考文档：https://www.lodashjs.com/docs/latest#_unsetobject-path
      // 入参方式   参数类型  忽略规则写法                               参数example                                       过滤后的example
      // form      object   ignoreParameters={"key"}                 {key:'', value:''}                               {key:'', value:''}
      // form      object   ignoreParameters={"nodes[0].key"}        {key:'', value:'',nodes:[{key:'', value:''}]}    {key:'', value:'',nodes:[{value:''}]}
      // form      array    ignoreParameters={"[0].key"}             [{key:'', value:''}]                             [{value:''}]
      // body      object   ignoreParameters={"item.key"}            {key:'', value:''}                               {key:'', value:''}
      // body      object   ignoreParameters={"item.nodes[0].key"}   {key:'', value:'',nodes:[{key:'', value:''}]}    {key:'', value:'',nodes:[{value:''}]}
      // body      array    ignoreParameters={"item.[0].key"}        [{key:'', value:''}]                             [{value:''}]
      // ********************************************************************
      //处理ignore
      const newValue = (() => {
        if (isObject(minfo.value)) {
          let cloneValue = null;
          //var tmpJson=JSON.parse(JSON.stringify(minfo.value)); // 深拷贝对象或数组
          var tmpJson=KUtils.json5parse(KUtils.json5stringify(minfo.value)); // 深拷贝对象或数组
          //判断include是否不为空
          if (swpinfo.includeParameters != null) {
            cloneValue=new IncludeAssemble(tmpJson,swpinfo.includeParameters).result();
          } else {
            cloneValue = tmpJson;
            if (swpinfo.ignoreParameters && isObject(minfo.value)) {
              Object.keys(swpinfo.ignoreParameters || {}).forEach(key => {
                const ignorePath = key.startsWith(`${originalName}.`) ?
                  key.replace(`${originalName}.`, '') // 处理 body 带参，需要加前缀问题
                  :
                  key;
                if (has(cloneValue, ignorePath)) {
                  // 使用 lodash.unset 方法移除 newValue 对象中的属性
                  unset(cloneValue, ignorePath);
                }
              });
            }
          }
          return cloneValue;
        }
        return null;
      })();
      if (isUndefined(newValue) || isNull(newValue)) {
        if (minfo.type === 'array') {
          minfo.txtValue = JSON.stringify([]);
        }
      } else {
        //如果type是发array类型,判断撒地方是否是integer
        //minfo.txtValue = JSON.stringify(minfo.type === 'array' ? [newValue] : newValue, null, "\t");
        minfo.txtValue = KUtils.json5stringify(minfo.type === 'array' ? [newValue] : newValue, null, "\t");
      }
    }
  }
  //JSR-303 注解支持.
  that.validateJSR303(minfo, m);
  if (!KUtils.checkParamArrsExists(swpinfo.parameters, minfo)) {
    const ignoreParameterKeys = Object.keys(swpinfo.ignoreParameters || {});
    // 处理请求参数表格依然展示忽略参数
    if (!ignoreParameterKeys.includes(originalName)) {
      swpinfo.parameters.push(minfo);
    }
    //判断当前属性是否是schema
    if (minfo.schema) {
      ////console("存在schema------------开始递归")
      ////console(minfo)

      //deepRefParameter(minfo, that, minfo.def, swpinfo);
      minfo.parentTypes.push(minfo.schemaValue);
      //第一层的对象要一直传递
      //deepTreeTableRefParameter(minfo, that, minfo.def, swpinfo);
    }
  }
}
/**
 * 处理Open API v3的请求参数，获取SwaggerBootstrapUiParameter的对象
 * @param {*} m
 * @param {*} swpinfo
 * @param {*} requireArray 必须数组
 */
SwaggerBootstrapUi.prototype.assembleParameterOAS3=function(m,swpinfo,requireArray){
  var that=this;
  var originalName = KUtils.propValue("name", m, "");
  var inType = KUtils.propValue("in", m, "");
  var minfo = new SwaggerBootstrapUiParameter();
  minfo.name = originalName;
  minfo.ignoreFilterName = originalName;
  minfo.type = KUtils.propValue("type", m, "");
  minfo.in = inType;
  minfo.require = KUtils.propValue("required", m, false);
  if(KUtils.arrNotEmpty(requireArray)){
    minfo.require=requireArray.includes(minfo.name);
  }
  minfo.description = KUtils.replaceMultipLineStr(KUtils.propValue("description", m, ""));
  //add at 2019-12-10 09:20:08  判断请求参数类型是否包含format
  //https://github.com/xiaoymin/swagger-bootstrap-ui/issues/161
  //判断是否有枚举类型
  if (m.hasOwnProperty("enum")) {
    //that.log("包括枚举类型...")
    //that.log(m.enum);
    minfo.enum = m.enum;
    //that.log(minfo);
    //枚举类型,描述显示可用值
    var avaiableArrStr = m.enum.join(",");
    if (m.description != null && m.description != undefined && m.description != "") {
      minfo.description = m.description + ",可用值:" + avaiableArrStr;
    } else {
      minfo.description = "枚举类型,可用值:" + avaiableArrStr;
    }

  }
  //判断你是否有默认值(后台)
  if (m.hasOwnProperty("default")) {
    minfo.txtValue = m["default"];
  }
  //swagger 2.9.2版本默认值响应X-EXAMPLE的值为2.9.2
  if (m.hasOwnProperty("x-example")) {
    minfo.txtValue = m["x-example"];
    if(KUtils.checkUndefined(minfo.txtValue)){
      minfo.example=minfo.txtValue;
    }
  }
  if (m.hasOwnProperty("schema")) {
    //存在schema属性,请求对象是实体类
    minfo.schema = true;
    var schemaObject = m["schema"];
    var schemaType = schemaObject["type"];
    minfo.type=schemaType;
    if (schemaType == "array") {
      minfo.type = schemaType;
      var schItem = schemaObject["items"];
      var ref = schItem["$ref"];
      var className = KUtils.getClassName(ref,swpinfo.oas2);
      minfo.schemaValue = className;
      var def = that.getDefinitionByName(className,swpinfo.oas2);
      if (def != null) {
        minfo.def = def;
        minfo.value = def.value;
        if (def.description != undefined && def.description != null && def.description != "") {
          minfo.description = KUtils.replaceMultipLineStr(def.description);
        }
      } else {
        var sty = schItem["type"];
        minfo.schemaValue = schItem["type"]
        //此处判断Array的类型,如果
        if (sty == "string") {
          minfo.value = "";
        }
        if (sty == "integer") {
          //判断format
          if (schItem["format"] != undefined && schItem["format"] != null && schItem["format"] == "int32") {
            minfo.value = 0;
          } else {
            minfo.value = 1054661322597744642;
          }
        }
        if (sty == "number") {
          if (schItem["format"] != undefined && schItem["format"] != null && schItem["format"] == "double") {
            minfo.value = 0.5;
          } else {
            minfo.value = 0;
          }
        }
        //2.判断是否包含枚举
        var _enumArray=KUtils.propValue("enum",schemaObject,[]);
        if(KUtils.arrNotEmpty(_enumArray)){
          //枚举不为空
          minfo.enum = _enumArray;
          //枚举类型,描述显示可用值
          var avaiableArrStr = _enumArray.join(",");
          if (m.description != null && m.description != undefined && m.description != "") {
            minfo.description = m.description + ",可用值:" + avaiableArrStr;
          } else {
            minfo.description = "枚举类型,可用值:" + avaiableArrStr;
          }
        }
      }
    }else if(KUtils.checkIsBasicType(schemaType)){
      //是否基础类型
      //1.判断整型的format
      var _format = KUtils.propValue("format", schemaObject, "");
      if (KUtils.strNotBlank(_format)) {
        //存在format
        var _rtype = schemaType + "(" + _format + ")";
        minfo.type = _rtype;
        if(_format=="binary"){
          //文件上传
          minfo.type="file";
        }
      }
      //2.判断是否包含枚举
      var _enumArray=KUtils.propValue("enum",schemaObject,[]);
      if(KUtils.arrNotEmpty(_enumArray)){
        //枚举不为空
        minfo.enum = _enumArray;
        //枚举类型,描述显示可用值
        var avaiableArrStr = _enumArray.join(",");
        if (m.description != null && m.description != undefined && m.description != "") {
          minfo.description = m.description + ",可用值:" + avaiableArrStr;
        } else {
          minfo.description = "枚举类型,可用值:" + avaiableArrStr;
        }
      }
    }else {
      if (schemaObject.hasOwnProperty("$ref")) {
        var ref = m["schema"]["$ref"];
        var className = KUtils.getClassName(ref,swpinfo.oas2);
        if (minfo.type != "array") {
          minfo.type = className;
        }
        minfo.schemaValue = className;
        var def = that.getDefinitionByName(className,swpinfo.oas2);
        if (def != null) {
          minfo.def = def;
          minfo.value = def.value;
          if (def.description != undefined && def.description != null && def.description != "") {
            minfo.description = KUtils.replaceMultipLineStr(def.description);
          }
        }
      } else {
        //判断是否包含addtionalProperties属性
        if (schemaObject.hasOwnProperty("additionalProperties")) {
          //判断是否是数组
          var addProp = schemaObject["additionalProperties"];
          if (addProp.hasOwnProperty("$ref")) {
            //object
            var className = KUtils.getClassName(addProp["$ref"],swpinfo.oas2);
            if (className != null) {
              var def = that.getDefinitionByName(className,swpinfo.oas2);
              if (def != null) {
                minfo.def = def;
                minfo.value = {
                  "additionalProperties1": def.value
                };
                if (def.description != undefined && def.description != null && def.description != "") {
                  minfo.description = KUtils.replaceMultipLineStr(def.description);
                }
              }
            }
          } else if (addProp.hasOwnProperty("items")) {
            //数组
            var addItems = addProp["items"];
            var className = KUtils.getClassName(addItems["$ref"],swpinfo.oas2);
            if (className != null) {
              var def = that.getDefinitionByName(className,swpinfo.oas2);
              if (def != null) {
                var addArrValue = new Array();
                addArrValue.push(def.value)
                minfo.def = def;
                minfo.value = {
                  "additionalProperties1": addArrValue
                };
                if (def.description != undefined && def.description != null && def.description != "") {
                  minfo.description = KUtils.replaceMultipLineStr(def.description);
                }
              }
            }

          }


        } else {
          if (schemaObject.hasOwnProperty("type")) {
            minfo.type = schemaObject["type"];
          }
          minfo.value = "";
        }
      }
    }
  }
  if (m.hasOwnProperty("items")) {
    var items = m["items"];
    if (items.hasOwnProperty("$ref")) {
      var ref = items["$ref"];
      var className = KUtils.getClassName(ref,swpinfo.oas2);
      //minfo.type=className;
      minfo.schemaValue = className;
      var def = that.getDefinitionByName(className,swpinfo.oas2);
      if (def != null) {
        minfo.def = def;
        minfo.value = def.value;
        if (def.description != undefined && def.description != null && def.description != "") {
          minfo.description = KUtils.replaceMultipLineStr(def.description);
        }
      }
    } else {
      if (items.hasOwnProperty("type")) {
        //minfo.type=items["type"];
        minfo.schemaValue = items["type"];
      }
      minfo.value = "";
    }
  }

  if (minfo.in == 'body') {
    if (isUndefined(minfo.txtValue) || isNull(minfo.txtValue)) {
      // ********************************************************************
      // 改造参数过滤规则，新的规则支持数组嵌套过滤，参考文档：https://www.lodashjs.com/docs/latest#_unsetobject-path
      // 入参方式   参数类型  忽略规则写法                               参数example                                       过滤后的example
      // form      object   ignoreParameters={"key"}                 {key:'', value:''}                               {key:'', value:''}
      // form      object   ignoreParameters={"nodes[0].key"}        {key:'', value:'',nodes:[{key:'', value:''}]}    {key:'', value:'',nodes:[{value:''}]}
      // form      array    ignoreParameters={"[0].key"}             [{key:'', value:''}]                             [{value:''}]
      // body      object   ignoreParameters={"item.key"}            {key:'', value:''}                               {key:'', value:''}
      // body      object   ignoreParameters={"item.nodes[0].key"}   {key:'', value:'',nodes:[{key:'', value:''}]}    {key:'', value:'',nodes:[{value:''}]}
      // body      array    ignoreParameters={"item.[0].key"}        [{key:'', value:''}]                             [{value:''}]
      // ********************************************************************
      //处理ignore
      const newValue = (() => {
        if (isObject(minfo.value)) {
          let cloneValue = null;
          //var tmpJson=JSON.parse(JSON.stringify(minfo.value)); // 深拷贝对象或数组
          var tmpJson=KUtils.json5parse(KUtils.json5stringify(minfo.value)); // 深拷贝对象或数组
          //判断include是否不为空
          if (swpinfo.includeParameters != null) {
            cloneValue=new IncludeAssemble(tmpJson,swpinfo.includeParameters).result();
            console.log(cloneValue);
          } else {
            cloneValue = tmpJson;
            if (swpinfo.ignoreParameters && isObject(minfo.value)) {
              Object.keys(swpinfo.ignoreParameters || {}).forEach(key => {
                const ignorePath = key.startsWith(`${originalName}.`) ?
                  key.replace(`${originalName}.`, '') // 处理 body 带参，需要加前缀问题
                  :
                  key;
                if (has(cloneValue, ignorePath)) {
                  // 使用 lodash.unset 方法移除 newValue 对象中的属性
                  unset(cloneValue, ignorePath);
                }
              });
            }
          }
          return cloneValue;
        }
        return null;
      })();
      if (isUndefined(newValue) || isNull(newValue)) {
        if (minfo.type === 'array') {
          minfo.txtValue = JSON.stringify([]);
        }
      } else {
        //如果type是发array类型,判断撒地方是否是integer
        //minfo.txtValue = JSON.stringify(minfo.type === 'array' ? [newValue] : newValue, null, "\t");
        minfo.txtValue = KUtils.json5stringify(minfo.type === 'array' ? [newValue] : newValue, null, "\t");
      }
    }
  }
  //JSR-303 注解支持.
  that.validateJSR303(minfo, m);
  if (!KUtils.checkParamArrsExists(swpinfo.parameters, minfo)) {
    const ignoreParameterKeys = Object.keys(swpinfo.ignoreParameters || {});
    // 处理请求参数表格依然展示忽略参数
    if (!ignoreParameterKeys.includes(originalName)) {
      swpinfo.parameters.push(minfo);
    }
    //判断当前属性是否是schema
    if (minfo.schema) {
      ////console("存在schema------------开始递归")
      ////console(minfo)

      //deepRefParameter(minfo, that, minfo.def, swpinfo);
      minfo.parentTypes.push(minfo.schemaValue);
      //第一层的对象要一直传递
      //deepTreeTableRefParameter(minfo, that, minfo.def, swpinfo);
    }
  }
}

/**
 * 过滤组件
 * @param json
 * @param includeArry
 * @constructor
 */
function IncludeAssemble(json,includeArry) {
  this.json=json;
  //包含的关系需要把参数的body名称去掉
  var filterArr=new Array();
  var tmpKeys = Object.keys(includeArry || {});
  tmpKeys.forEach(key=>{
    filterArr.push(key.substring(key.indexOf(".")+1))
  })
  this.includeArrays=filterArr;
}

IncludeAssemble.prototype={
  isObjInArray (o) {
      if(!this.isArray(o)){
          return false;
      }
      if(o.length===0){
          return false;
      }
      return this.isObject(o[0]);
  },
  isObject(o){
      return Object.prototype.toString.call(o)=== '[object Object]';
  },
  isArray(o){
      return Object.prototype.toString.call(o) === '[object Array]';
  },
  merge(source,target){
      if(this.isObject(source)){
          for (let key in target) {
              source[key] = this.isObject(source[key])||this.isObjInArray(source[key]) ?
                  this.merge(source[key], target[key]) : source[key] = target[key];
          }
      }else{
          if(this.isObjInArray(target)){
              source.forEach((o1,index)=>{
                  this.merge(o1,target[index]);
              })
          }else{
              source.push.apply(source,target);
          }
      }
      return source;
  },
  getByPath(srcObj,path){
      if(this.isObjInArray(srcObj)){
          const r=[];
          srcObj.forEach(el=>{
              r.push(this.getByPath(el,path));
          });
          return r;
      }else{
          const pathArr=path.split(".");
          //const r=JSON.parse(JSON.stringify(srcObj));
          const r=KUtils.json5parse(KUtils.json5stringify(srcObj));
          let tempObj=r;
          const len=pathArr.length;
          for (let i = 0; i < len; i++) {
              let pathComp = pathArr[i];
              for (let k in tempObj){
                  if(k!==pathComp){
                      delete tempObj[k];
                  }
              }
              if(!tempObj[pathComp]){
                  break;
              }
              if(this.isObjInArray(tempObj[pathComp])){
                  let t=this.getByPath(tempObj[pathComp],pathArr.slice(i+1).join('.'));
                  //tempObj[pathComp]=JSON.parse(JSON.stringify(t));
                  tempObj[pathComp]=KUtils.json5parse(KUtils.json5stringify(t));
                  break;
              }
              tempObj=tempObj[pathComp];
          }
          return r
      }
  },
  result(){
    if(this.includeArrays==null||this.includeArrays.length==0){
      return this.json;
    }else{
      let arr=[];
      this.includeArrays.forEach(p=>{
          arr.push(this.getByPath(this.json,p));
      });
      return arr.reduce((prev,cur)=>{
          if(prev){
              this.merge(prev,cur);
              return prev;
          }
          return cur
      });
    }
  }
}
/***
 * 根据api接口自定义tags添加
 * @param name
 */
SwaggerBootstrapUi.prototype.mergeApiInfoSelfTags = function (name) {
  var that = this;
  var flag = false;
  that.currentInstance.tags.forEach(function (tag) {
    //})
    //$.each(that.currentInstance.tags,function (i, tag) {
    if (tag.name == name) {
      flag = true;
    }
  })
  if (!flag) {
    var ntag = new SwaggerBootstrapUiTag(name, name);
    that.currentInstance.tags.push(ntag);
  }
}
/***
 * JSR-303支持
 * @param parameter
 */
SwaggerBootstrapUi.prototype.validateJSR303 = function (parameter, origin) {
  var max = origin["maximum"],
    min = origin["minimum"],
    emin = origin["exclusiveMinimum"],
    emax = origin["exclusiveMaximum"];
  var pattern = origin["pattern"];
  var maxLength = origin["maxLength"],
    minLength = origin["minLength"];
  if (max || min || emin || emax) {
    parameter.validateStatus = true;
    parameter.validateInstance = {
      minimum: min,
      maximum: max,
      exclusiveMaximum: emax,
      exclusiveMinimum: emin
    };
  } else if (pattern) {
    parameter.validateStatus = true;
    parameter.validateInstance = {
      "pattern": origin["pattern"]
    };
  } else if (maxLength || minLength) {
    parameter.validateStatus = true;
    parameter.validateInstance = {
      maxLength: maxLength,
      minLength: minLength
    };
  }
}

/**
 * 根据类名查找definition
 * @param {*} name
 * @param {*} oas
 */
SwaggerBootstrapUi.prototype.getDefinitionByName = function (name,oas) {
  var that = this;
  var def = null;
  //默认使用v2版本
  var oasFlag=true;
  if(KUtils.checkUndefined(oas)){
    oasFlag=oas;
  }
  that.currentInstance.difArrs.forEach(function (d) {
    if (d.name == name) {
      if(!d.init){
        d.init=true;
        that.analysisDefinitionAsync(that.currentInstance.swaggerData,d,oasFlag);
      }
      def = d;
      return;
    }
  })
  //改为异步加载后,异步初始化class
  return def;
}

/**
 * 递归解析definition
 * @param {*} definitionName 名称
 * @param {*} definitions
 * @param {*} flag
 * @param {*} globalArr
 * @param {*} xname
 * @param {*} oas 是否v2版本
 */
SwaggerBootstrapUi.prototype.findRefDefinition = function (definitionName, definitions, flag, globalArr,xname,oas) {
  var that = this;
  var defaultValue = "";
  if (KUtils.checkUndefined(that.currentInstance.definitionValues[definitionName])) {
    defaultValue = that.currentInstance.definitionValues[definitionName];
  } else {
    for (var definition in definitions) {
      if (definitionName == definition) {
        //不解析本身
        //that.log("解析definitionName:"+definitionName);
        //that.log("是否递归："+flag);
        var value = definitions[definition];
        //是否有properties
        if (value.hasOwnProperty("properties")) {
          var properties = value["properties"];
          var defiTypeValue = {};
          for (var property in properties) {
            var propobj = properties[property];
            if (!propobj.hasOwnProperty("readOnly") || !propobj["readOnly"]) {
              //默认string类型
              var propValue = "";
              //判断是否有类型
              if (propobj.hasOwnProperty("type")) {
                var type = propobj["type"];
                //判断是否有example
                if (propobj.hasOwnProperty("example")) {
                  propValue = propobj["example"];
                } else if (KUtils.checkIsBasicType(type)) {
                  propValue = KUtils.getBasicTypeValue(type);
                  //此处如果是object情况,需要判断additionalProperties属性的情况
                  if (type == "object") {
                    if (propobj.hasOwnProperty("additionalProperties")) {
                      var addpties = propobj["additionalProperties"];
                      var addtionalName=this.deepAdditionalProperties(addpties,oas);
                      //console.log("递归类型---"+addtionalName)
                      //判断是否有ref属性,如果有,存在引用类,否则默认是{}object的情况
                      if(KUtils.strNotBlank(addtionalName)){
                        //console.log("-------------------------addtionalName--------"+addtionalName)
                        //添加类本身
                        if(globalArr.indexOf(addtionalName)==-1){
                          globalArr.push(addtionalName);
                          addTempValue = that.findRefDefinition(addtionalName, definitions, false, globalArr,xname,oas);
                          propValue = {
                            "additionalProperties1": addTempValue
                          }
                        }
                      }
                      //判断是否有ref属性,如果有,存在引用类,否则默认是{}object的情况
                      else if (addpties.hasOwnProperty("$ref")) {
                        var adref = addpties["$ref"];
                        var regex = new RegExp(KUtils.oasmodel(oas), "ig");
                        if (regex.test(adref)) {
                          var addrefType = RegExp.$1;
                          var addTempValue = null;
                          if (!flag) {
                            if (globalArr.indexOf(addrefType) == -1) {
                              //console.log("addrefType:"+addrefType)
                              //全局类型增加父类型,否则会出现递归死循环
                              globalArr.push(addrefType);
                              addTempValue = that.findRefDefinition(addrefType, definitions, flag, globalArr,xname,oas);
                              propValue = {
                                "additionalProperties1": addTempValue
                              }
                            }

                          }
                        }
                      }
                    }
                  }
                } else {
                  if (type == "array") {
                    propValue = new Array();
                    var items = propobj["items"];
                    var ref = items["$ref"];
                    if (items.hasOwnProperty("type")) {
                      if (items["type"] == "array") {
                        ref = items["items"]["$ref"];
                      }
                    }
                    var regex = new RegExp(KUtils.oasmodel(oas), "ig");
                    if (regex.test(ref)) {
                      var refType = RegExp.$1;
                      if (!flag) {
                        //判断是否存在集合中
                        if (globalArr.indexOf(refType) != -1) {
                          //存在
                          propValue.push({});
                        } else {
                          globalArr.push(definitionName);
                          propValue.push(that.findRefDefinition(refType, definitions, flag, globalArr,xname,oas));
                        }
                      }

                    }
                  }
                }

              } else {
                //存在ref
                if (propobj.hasOwnProperty("$ref")) {
                  var ref = propobj["$ref"];
                  var regex = new RegExp(KUtils.oasmodel(oas), "ig");
                  if (regex.test(ref)) {
                    var refType = RegExp.$1;
                    //这里需要递归判断是否是本身,如果是,则退出递归查找
                    if (!flag) {
                      //if($.inArray(refType,globalArr) != -1){
                      if (globalArr.indexOf(refType) != -1) {
                        //存在
                        propValue = {};
                      } else {
                        globalArr.push(definitionName);
                        propValue = that.findRefDefinition(refType, definitions, flag, globalArr,xname,oas);
                      }
                    }
                  }
                } else {
                  propValue = {};
                }

              }
              defiTypeValue[property] = propValue;
            }
          }
          defaultValue = defiTypeValue;
        } else {
          defaultValue = {};
        }
      }
    }
    //赋值
    that.currentInstance.definitionValues[definitionName] = defaultValue;
  }
  return defaultValue;
}

/***
 * 计数
 * @param method
 */
SwaggerBootstrapUi.prototype.methodCountAndDown = function (method) {
  var that = this;
  var flag = false;
  that.currentInstance.pathArrs.forEach(function (a) {
    //})
    //$.each(that.currentInstance.pathArrs,function (i, a) {
    if (a.method == method) {
      flag = true;
      //计数加1
      a.count = a.count + 1;
    }
  })
  if (!flag) {
    var me = new SwaggerBootstrapUiPathCountDownLatch();
    me.method = method;
    me.count = 1;
    that.currentInstance.pathArrs.push(me);
  }
}
/***
 * 获取全局缓存auth信息
 */
SwaggerBootstrapUi.prototype.getGlobalSecurityInfos = function () {
  var that = this;
  var params = [];
  if (window.localStorage) {
    var store = window.localStorage;
    var globalparams = store["SwaggerBootstrapUiSecuritys"];
    if (globalparams != undefined && globalparams != null && globalparams != "") {
      //var gpJson = JSON.parse(globalparams);
      var gpJson = KUtils.json5parse(globalparams);
      gpJson.forEach(function (j) {
        //})
        //$.each(gpJson, function (i, j) {
        params = params.concat(j.value);
      })
    }
  } else {
    //params=$("#sbu-header").data("cacheSecurity");
  }
  return params;
}
/***
 * 计数器
 * @constructor
 */
var SwaggerBootstrapUiPathCountDownLatch = function () {
  this.method = "";
  this.count = 0;
}

function deepResponseRefParameter(swpinfo, that, def, resParam) {
  if (def != null) {
    if (def.hasOwnProperty("properties")) {
      var refParam = new SwaggerBootstrapUiRefParameter();
      refParam.name = def.name;
      if (!KUtils.checkParamArrsExists(swpinfo.responseRefParameters, refParam)) {
        swpinfo.responseRefParameters.push(refParam);
        if (def.hasOwnProperty("properties")) {
          var props = def["properties"];
          props.forEach(function (p) {
            //})
            //$.each(props,function (i, p) {
            var refp = new SwaggerBootstrapUiParameter();
            refp.pid = resParam.id;
            refp.name = p.name;
            refp.type = p.type;
            refp.description = KUtils.replaceMultipLineStr(p.description);
            //add之前需要判断是否已添加,递归情况有可能重复
            refParam.params.push(refp);
            //判断类型是否基础类型
            if (!KUtils.checkIsBasicType(p.refType)) {
              refp.schemaValue = p.refType;
              refp.schema = true;
              if (resParam.name != refp.name || resParam.schemaValue != p.refType) {
                var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                deepResponseRefParameter(swpinfo, that, deepDef, refp);
              }
            }
          })
        }
      }
    }
  }
}

function deepTreeTableResponseRefParameter(swpinfo, that, def, resParam) {
  if (def != null) {
    if (def.hasOwnProperty("properties")) {
      var refParam = new SwaggerBootstrapUiTreeTableRefParameter();
      refParam.name = def.name;
      refParam.id = resParam.id;
      if (!checkParamTreeTableArrsExists(swpinfo.responseTreetableRefParameters, refParam)) {
        //firstParameter.childrenTypes.push(def.name);
        swpinfo.responseTreetableRefParameters.push(refParam);
        if (def.hasOwnProperty("properties")) {
          var props = def["properties"];
          props.forEach(function (p) {
            //})
            //$.each(props,function (i, p) {
            var refp = new SwaggerBootstrapUiParameter();
            resParam.parentTypes.forEach(function (pt) {
              refp.parentTypes.push(pt);
            })
            /*  $.each(resParam.parentTypes,function (i, pt) {
                 refp.parentTypes.push(pt);
             }) */
            if (p.hasOwnProperty("readOnly")) {
              refp.readOnly = p.readOnly;
            }
            refp.parentTypes.push(def.name);
            refp.pid = resParam.id;
            refp.name = p.name;
            refp.type = p.type;
            refp.description = KUtils.replaceMultipLineStr(p.description);
            refp.example = p.example;
            //add之前需要判断是否已添加,递归情况有可能重复
            refParam.params.push(refp);
            //判断类型是否基础类型
            if (!KUtils.checkIsBasicType(p.refType)) {
              refp.schemaValue = p.refType;
              refp.schema = true;
              if (resParam.name != refp.name || resParam.schemaValue != p.refType) {
                var deepDef = that.getDefinitionByName(p.refType,swpinfo.oas2);
                if (!checkDeepTypeAppear(refp.parentTypes, p.refType)) {
                  deepTreeTableResponseRefParameter(swpinfo, that, deepDef, refp);
                }
              }
            } else {
              if (p.type == "array") {
                if (p.refType != null && p.refType != undefined && p.refType != "") {
                  refp.schemaValue = p.refType;
                }
              }
            }
          })
        }
      }

    }
  }
}

/***
 * treeTable组件
 * @param minfo
 * @param that
 * @param def
 * @param apiInfo
 * @param oas2 是否v2版本
 */
function deepTreeTableRefParameter(minfo, that, def, apiInfo,oas2) {
  if (def != null) {
    //查询
    if (KUtils.checkUndefined(that.currentInstance.refTreeTableModels[def.name])) {
      //存在
      ////console("refTreeTableModels-----------递归存在,modelName:" + def.name)
      var refParam = that.currentInstance.refTreeTableModels[def.name];
      ////console(refParam)
      apiInfo.refTreetableparameters.push(refParam);
      apiInfo.refTreetableModelsparameters.push(refParam);
    } else {
      var refParam = new SwaggerBootstrapUiTreeTableRefParameter();
      refParam.name = def.name;
      refParam.id = minfo.id;
      //SwaggerModels
      var refModelParam = new SwaggerBootstrapUiTreeTableRefParameter();
      refModelParam.name = def.name;
      refModelParam.id = minfo.id;
      //如果当前属性中的schema类出现过1次则不在继续,防止递归死循环
      if (!checkParamTreeTableArrsExists(apiInfo.refTreetableparameters, refParam)) {
        //firstParameter.childrenTypes.push(def.name);
        apiInfo.refTreetableparameters.push(refParam);
        apiInfo.refTreetableModelsparameters.push(refModelParam);
        if (def.hasOwnProperty("properties")) {
          var props = def["properties"];
          props.forEach(function (p) {
            var _ignoreFilterName = minfo.ignoreFilterName + "." + p.name;
            if (apiInfo.ignoreParameters == null || (apiInfo.ignoreParameters != null && !apiInfo.ignoreParameters.hasOwnProperty(_ignoreFilterName))) {
              var refp = new SwaggerBootstrapUiParameter();
              refp.pid = minfo.id;
              minfo.parentTypes.forEach(function (pt) {
                refp.parentTypes.push(pt);
              })
              refp.readOnly = p.readOnly;
              //refp.parentTypes=minfo.parentTypes;
              refp.parentTypes.push(def.name)
              //level+1
              refp.level = minfo.level + 1;
              refp.name = p.name;
              refp.ignoreFilterName = _ignoreFilterName;
              refp.type = p.type;
              //判断非array
              if (p.type != "array") {
                if (p.refType != null && p.refType != undefined && p.refType != "") {
                  //修复针对schema类型的参数,显示类型为schema类型
                  refp.type = p.refType;
                }
              }
              refp.in = minfo.in;
              refp.require = p.required;
              refp.example = p.example;
              refp.description = KUtils.replaceMultipLineStr(p.description);
              that.validateJSR303(refp, p.originProperty);
              //models添加所有属性
              refModelParam.params.push(refp);
              if (!p.readOnly) {
                refParam.params.push(refp);
              }
              //判断类型是否基础类型
              if (KUtils.checkUndefined(p.refType) && !KUtils.checkIsBasicType(p.refType)) {
                ////console("schema类型--------------" + p.refType)
                refp.schemaValue = p.refType;
                refp.schema = true;
                //属性名称不同,或者ref类型不同
                if (minfo.name != refp.name || minfo.schemaValue != p.refType) {
                  var deepDef = that.getDefinitionByName(p.refType,oas2);
                  if (!checkDeepTypeAppear(refp.parentTypes, p.refType)) {
                    deepTreeTableRefParameter(refp, that, deepDef, apiInfo,oas2);
                  }
                }
              } else {
                if (p.type == "array") {
                  if (p.refType != null && p.refType != undefined && p.refType != "") {
                    //修复针对schema类型的参数,显示类型为schema类型
                    refp.schemaValue = p.refType;
                  }
                }
              }
            }
          })

        }
      }
      //存放值
      that.currentInstance.refTreeTableModels[def.name] = refParam;
    }
  }
}

/***
 * 递归查询
 * @param minfo
 * @param that
 * @param def
 */
function deepRefParameter(minfo, that, def, apiInfo) {
  if (def != null) {
    var refParam = new SwaggerBootstrapUiRefParameter();
    refParam.name = def.name;
    if (!KUtils.checkParamArrsExists(apiInfo.refparameters, refParam)) {
      apiInfo.refparameters.push(refParam);
      if (def.hasOwnProperty("properties")) {
        var props = def["properties"];
        props.forEach(function (p) {

          //})
          //$.each(props,function (i, p) {
          //如果当前属性为readOnly，则不加入
          if (!p.readOnly) {
            var _filterName = minfo.ignoreFilterName + "." + p.name;
            //判断是否忽略
            if (apiInfo.ignoreParameters == null || (apiInfo.ignoreParameters != null && !apiInfo.ignoreParameters.hasOwnProperty(_filterName))) {
              var refp = new SwaggerBootstrapUiParameter();
              refp.pid = minfo.id;
              refp.name = p.name;
              refp.ignoreFilterName = _filterName;

              refp.type = p.type;
              //判断非array
              if (p.type != "array") {
                if (p.refType != null && p.refType != undefined && p.refType != "") {
                  //修复针对schema类型的参数,显示类型为schema类型
                  refp.type = p.refType;
                }
              }
              refp.in = minfo.in;
              refp.require = p.required;
              refp.description = KUtils.replaceMultipLineStr(p.description);
              that.validateJSR303(refp, p.originProperty);
              refParam.params.push(refp);
              //判断类型是否基础类型
              if (!KUtils.checkIsBasicType(p.refType)) {
                refp.schemaValue = p.refType;
                refp.schema = true;
                //属性名称不同,或者ref类型不同
                if (minfo.name != refp.name || minfo.schemaValue != p.refType) {
                  var deepDef = that.getDefinitionByName(p.refType);
                  deepRefParameter(refp, that, deepDef, apiInfo);
                }
              }
            }
          }

        })
      }
    }
  }
}
/***
 * 递归父类是否出现
 * @param types
 * @param type
 * @returns {boolean}
 */
function checkDeepTypeAppear(types, type) {
  var flag = false;
  types.forEach(function (t) {
    if (t == type) {
      flag = true;
    }
  })
  return flag;
}

function checkParamTreeTableArrsExists(arr, param) {
  var flag = false;
  if (arr != null && arr.length > 0) {
    arr.forEach(function (a) {
      if (a.name == param.name && a.id == param.id) {
        flag = true;
      }
    })
  }
  return flag;
}

function deepSchemaModel(model, arrs, id) {
  ////console(model.name)
  arrs.forEach(function (arr) {
    //})
    //$.each(arrs,function (i, arr) {
    if (arr.id == id) {
      //找到
      model.data = model.data.concat(arr.params);
      //遍历params
      if (arr.params != null && arr.params.length > 0) {
        arr.params.forEach(function (ps) {
          //})
          //$.each(arr.params, function (j, ps) {
          if (ps.schema) {
            deepSchemaModel(model, arrs, ps.id);
          }
        })
      }
    }
  })
}

/***
 * SwaggerBootstrapUi Model树对象
 * @param id
 * @param name
 * @constructor
 */
var SwaggerBootstrapUiModel = function (id, name) {
  this.id = id;
  this.name = name;
  //存放Model对象的属性结构
  //SwaggerBootstrapUiTreeTableRefParameter集合
  this.data = new Array();
  this.random = parseInt(Math.random() * (6 - 1 + 1) + 1, 10);
  this.modelClass = function () {
    var cname = "panel-default";
    switch (this.random) {
      case 1:
        cname = "panel-success";
        break;
      case 2:
        cname = "panel-success";
        break;
      case 3:
        cname = "panel-info";
        break;
      case 4:
        cname = "panel-warning";
        break;
      case 5:
        cname = "panel-danger";
        break;
      case 6:
        cname = "panel-default";
        break;
    }
    return cname;
  }

}

/***
 * 响应码
 * @constructor
 */
var SwaggerBootstrapUiResponseCode = function () {
  this.oas2=false,
  this.code = null;
  this.description = null;
  this.schema = null;
  //treetable组件使用对象
  this.refTreetableparameters = new Array();
  this.responseCodes = new Array();
  this.responseValue = null;
  this.responseJson = null;
  this.responseText = null;
  this.responseBasicType = false;
  //响应Header字段说明
  this.responseHeaderParameters = null;
  //响应字段说明
  this.responseParameters = new Array();
  this.responseParameterRefName = "";
  this.responseRefParameters = new Array();
  //treetable组件使用对象
  this.responseTreetableRefParameters = new Array();
  this.responseDescriptionFind = function (paths, key, that) {
    if (!this.responseDescriptions) {
      this.responseDescriptions = getKeyDescriptions(this.responseParameters, that);
    }
    var path = paths.join('>') + '>' + key;
    path = path.replace(/0>/g, '');
    //console.log(this.responseDescriptions)
    if (this.responseDescriptions && this.responseDescriptions[path]) {
      return this.responseDescriptions[path];
    }
    return '';
  }
}

var getKeyDescriptions = function (target, that, parentTypes) {
  var keyList = {};
  if (typeof (target) == 'object') {
    if (Array.isArray(target)) {
      for (var index in target) {
        var objc = target[index];
        //遍历属性
        if (parentTypes == null || parentTypes == undefined) {
          //first init
          parentTypes = new Array();
        }
        if (typeof (objc) == 'object') {
          var key = objc.name;
          var keyListTemp;
          keyList[key] = objc.description;
          if (objc.schemaValue || objc.refType) {
            //此处判断父级schema不能是自己
            //parentTypes次数>1此,出现递归
            if (parentTypes.indexOf(objc.schemaValue || objc.refType) == -1) {
              //if ($.inArray(objc.schemaValue || objc.refType, parentTypes) == -1) {
              parentTypes.push(objc.schemaValue || objc.refType);
              var def = that.getDefinitionByName(objc.schemaValue || objc.refType);
              if (def) {
                if (def.properties) {
                  //递归存在相互引用的情况,导致无限递归
                  keyListTemp = getKeyDescriptions(def.properties, that, parentTypes);
                }
              }
            }
          } else if (objc.params) {
            keyListTemp = getKeyDescriptions(objc.params, that);
          }
          if (keyListTemp) {
            for (var j in keyListTemp) {
              keyList[key + ">" + j] = keyListTemp[j];
            }
          }
        }
      }
    }
  }
  return keyList;
}
/**
 * 过滤多余POST功能
 */
var SwaggerBootstrapUiApiFilter = function () {
  this.api = function (methodType) {
    var apis = new Array();
    //判断当前methods类型,如果methods只有1条则返回
    if (this.methods.length == 7) {
      //如果是7个则 开启过滤
      var mpt = null;
      //如果接口梳理是7个
      for (var c = 0; c < this.methods.length; c++) {
        if (this.methods[c].methodType == methodType) {
          mpt = this.methods[c];
        }
      }
      if (mpt == null) {
        mpt = this.methods[0];
      }
      apis.push(mpt);
    } else {
      apis = apis.concat(this.methods);
    }
    return apis;

  };
  this.methods = new Array();
}

/***
 * 缓存更新对象
 * @constructor
 */
var SwaggerBootstrapUiCacheUptApi = function (id) {
  //当前版本id
  this.url = "";
  this.versionId = id;
  this.lastTime = new Date();
}
/***
 *
 * [{
 *  id:"md5(groupName)",
 *  groupApis:["id1","id2"]
 * }]
 * @constructor
 */
function SwaggerBootstrapUiCacheApis(options) {
  //分组id
  this.id = options.id || '';
  //分组名称
  this.name = options.name || '';
  //缓存api-id 对象的集合
  this.cacheApis = [];
  //缓存整个对象的id?
  //存储 id:{"uptversion":"102010221299393993","lastTime":"2019/11/12 12:30:33"}
  this.updateApis = {};
}

/***
 * 返回对象解析属性
 * @constructor
 */
var SwaggerBootstrapUiDefinition = function () {
  //是否初始化过,作为异步加载的条件
  this.init=false;
  //类型名称
  this.name = "";
  this.ignoreFilterName = null;
  this.schemaValue = null;
  //this.id = "definition" + Math.round(Math.random() * 1000000);
  this.id = "definition" + KUtils.randomMd5();
  this.pid = "-1";
  this.level = 1;
  this.childrenTypes = new Array();
  this.parentTypes = new Array();
  //介绍
  this.description = "";
  //类型
  this.type = "";
  //属性 --SwaggerBootstrapUiProperty 集合
  this.properties = new Array();
  this.value = null;
  //add by xiaoymin 2018-8-1 13:35:32
  this.required = new Array();
  this.title = "";
  //treetable组件使用对象
  this.refTreetableparameters = new Array();
  //swaggerModels功能
  this.refTreetableModelsparameters = new Array();
}
/**
 * 权限验证
 * @constructor
 */
var SwaggerBootstrapUiSecurityDefinition = function () {
  this.key = "";
  this.type = "";
  this.in = "";
  this.name = "";
  this.value = "";
  //add at 2019-12-7 18:20:35
  this.id = "";

}

/***
 * definition对象属性
 * @constructor
 */
var SwaggerBootstrapUiProperty = function () {
  //默认基本类型,非引用
  this.basic = true;
  this.name = "";
  this.type = "";
  this.refType = null;
  this.description = "";
  this.example = "";
  this.format = "";
  //是否必须
  this.required = false;
  //默认值
  this.value = null;
  //引用类
  this.property = null;
  //原始参数
  this.originProperty = null;
  //是否枚举
  this.enum = null;
  //是否readOnly
  this.readOnly = false;
}
/***
 * swagger的tag标签
 * @param name
 * @param description
 * @constructor
 */
var SwaggerBootstrapUiTag = function (name, description) {
  this.name = name;
  this.description = description;
  //add by xiaoymin 2020-4-5 11:03:07 分组作者
  this.author = null;
  this.childrens = new Array();
  //是否有新接口
  this.hasNew = false;
  //是否有接口变更
  this.hasChanged = false;
}
/***
 * Swagger接口基础信息
 * @constructor
 */
var SwaggerBootstrapUiApiInfo = function () {
  //是否已经初始化过,作为异步初始化存在
  this.init=false;
  //是否是oas2的接口
  this.oas2=true;
  //原始对象
  this.originalApiInfo=null;
  this.url = null;
  this.originalUrl = null;
  this.configurationDebugSupport = true;
  this.showUrl = "";
  this.basePathFlag = false;
  //接口作者
  this.author = null;
  this.methodType = null;
  this.description = null;
  this.summary = null;
  this.consumes = null;
  this.operationId = null;
  this.produces = null;
  this.tags = null;
  //默认请求contentType
  this.contentType = "application/json";
  this.contentShowValue = "JSON(application/json)";
  //请求如果是raw类型,给定mode类型
  this.contentMode = "Text";
  //显示参数
  //存储请求类型，form|row|urlencode
  this.contentValue = "raw";
  this.parameters = new Array();
  //参数数量
  this.parameterSize = 0;
  //请求json示例
  this.requestValue = null;
  //是否xml请求
  this.xmlRequest = false;
  //针对parameter属性有引用类型的参数,继续以table 的形式展现
  //存放SwaggerBootstrapUiRefParameter 集合
  this.refparameters = new Array();
  //treetable组件使用对象
  this.refTreetableparameters = new Array();
  //swaggerModels功能
  this.refTreetableModelsparameters = new Array();
  //请求参数treetalbe
  // add at 2019-12-15 13:29:19
  this.reqParameters = new Array();

  this.responseCodes = new Array();
  this.responseHttpObject = null;
  /***
   * 返回状态码为200的
   */
  this.getHttpSuccessCodeObject = function () {
    if (this.responseHttpObject == null) {
      if (this.responseCodes != null && this.responseCodes.length > 0) {
        var _tmp = null;
        for (var i = 0; i < this.responseCodes.length; i++) {
          if (this.responseCodes[i].code == "200") {
            _tmp = this.responseCodes[i];
            break;
          }
        }
        this.responseHttpObject = _tmp;
      }
    }
    return this.responseHttpObject;
  }

  this.responseValue = null;
  this.responseJson = null;
  this.responseText = null;
  this.responseBasicType = false;
  //响应Header字段说明
  this.responseHeaderParameters = null;
  //响应字段说明
  this.responseParameters = new Array();
  this.responseParameterRefName = "";
  this.responseRefParameters = new Array();
  //treetable组件使用对象
  this.responseTreetableRefParameters = new Array();
  //新增菜单id
  this.id = "";
  //版本id
  this.versionId = "";
  //排序
  this.order = 2147483647;
  //add by xiaoymin 2018-12-14 17:04:42
  //是否新接口
  this.hasNew = false;
  //是否有接口变更
  this.hasChanged = false;
  //是否过时
  this.deprecated = false;
  //是否存在响应状态码中  存在多个schema的情况
  this.multipartResponseSchema = false;
  this.multipartResponseSchemaCount = 0;
  //hashUrl
  this.hashCollections = [];
  //ignoreParameters add 2019-7-30 16:10:08
  this.ignoreParameters = null;
  //includeParameters add 2020-4-5 14:12:23
  this.includeParameters = null;
  //当前接口用户实例id add 2019-12-5 10:49:40
  this.instanceId = null;
  // 用于请求后构建curl
  this.host = null;
}

var SwaggerBootstrapUiRefParameter = function () {
  this.name = null;
  //存放SwaggerBootstrapUiParameter集合
  this.params = new Array();
}

var SwaggerBootstrapUiTreeTableRefParameter = function () {
  //是否已经加载
  this.init=false;
  this.id = "";
  this.name = null;
  //存放SwaggerBootstrapUiParameter集合
  this.params = new Array();
  this.level = 1;
  this.childrenTypes = new Array();


}

/***
 * Swagger请求参数
 * @constructor
 */
var SwaggerBootstrapUiParameter = function () {
  this.name = null;
  //该属性用于过滤参数使用
  this.ignoreFilterName = null;
  //默认false
  this.require = false;
  this.type = null;
  this.in = null;
  this.schema = false;
  this.schemaValue = null;
  this.value = null;
  //JSR-303 annotations supports since 1.8.7
  //默认状态为false
  this.validateStatus = false;
  this.validateInstance = null;
  //引用类
  this.def = null;
  //des
  this.description = null;
  //文本框值
  this.txtValue = null;
  //枚举类型
  this.enum = null;

  //this.id = "param" + Math.round(Math.random() * 1000000);
  this.id = uniqueId('param'); // "param" + KUtils.randomMd5(); 使用 uniqueId 方法替代
  this.pid = "-1";
  this.level = 1;
  //参数是否显示在debug中
  this.show = true;
  //是否readOnly
  this.readOnly = false;
  this.example = null;


  this.childrenTypes = new Array();
  this.children=null;
  this.parentTypes = new Array();
}

function SwaggerBootstrapUiParameterLevel() {
  this.level = 1;

}

/***
 * swagger 分组对象
 * @param name 分组对象名称
 * @param location url地址
 * @param version 版本号
 * @constructor
 */
function SwaggerBootstrapUiInstance(name, location, version) {
  //当前Swagger的json
  this.swaggerData=null;
  //this.id = 'SwaggerBootstrapUiInstance' + Math.round(Math.random() * 1000000)
  this.id = 'SwaggerBootstrapUiInstance' + md5(name + location + version)
  //默认未加载
  this.load = false
  //分组名称
  this.name = name
  //分组url地址
  this.location = location
  //不分组是url地址
  this.url = null
  //增强地址
  this.extUrl = null
  this.groupVersion = version
  //分组url请求实例
  this.basePath = ''
  //使用nginx,反向代理服务名称
  this.baseUrl = ''
  this.host = ''
  this.swagger = ''
  this.description = ''
  this.title = ''
  this.version = ''
  this.termsOfService = ''
  this.contact = ''
  //当前definistion数组
  // SwaggerBootstrapUiDefinition 集合
  this.difArrs = []
  //difinition的请求value缓存值
  //key-definiationName  -value :requestValue
  // add 2019-12-11 15:06:30
  this.definitionValues = {};
  //针对Swagger Models功能,再存一份SwaggerBootstrapUiDefinition集合
  this.swaggerModelsDifinitions = []
  //add 2019-12-11 20:08:51
  //该属性针对SwaggerModels功能,避免和refTreeTableModels属性功能重叠
  this.swaggerTreeTableModels={};
  //存放treeTable已经递归查询过的schema值
  this.refTreeTableModels = {};
  //标签分类信息组
  //SwaggerBootstrapUiTag 集合
  this.tags = []
  //接口url信息
  //存储SwaggerBootstrapUiApiInfo 集合
  this.paths = []
  //字典
  this.pathsDictionary = {}
  //全局参数,存放SwaggerBootstrapUiParameter集合
  this.globalParameters = []
  //参数统计信息，存放SwaggerBootstrapUiPathCountDownLatch集合
  this.pathArrs = []
  //key-value方式存放
  //key-存放接口地址
  //value:存放实际值
  this.pathFilters = {}
  //权限信息
  this.securityArrs = []
  //Models
  this.models = []
  this.modelNames = []
  //新版本的models 适配antd的属性表格
  this.modelArrs = []

  //SwaggerBootstrapCacheGroupApis 对象的集合
  //add by xiaoyumin 2018-12-12 18:49:22
  this.groupId = md5(name)
  this.firstLoad = true
  this.groupApis = []
  //缓存对象
  //this.cacheInstance=new SwaggerBootstrapUiCacheApis({id:this.groupId,name:this.name});
  this.cacheInstance = null
  //自定义文档
  this.markdownFiles = []

  this.i18n = null
}

/**
 * 判断是否是swagger2
 */
SwaggerBootstrapUiInstance.prototype.oas2=function(){
  if(this.groupVersion.indexOf("2")>=0){
    return true;
  }
  return false;
}
/**
 * 获取类结构
 */
SwaggerBootstrapUiInstance.prototype.getOASDefinitions=function(){
  var definitions={};
  var swaggerData=this.swaggerData;
  if(this.oas2()){
    if(KUtils.checkUndefined(swaggerData)&&swaggerData.hasOwnProperty("definitions")){
      if(KUtils.checkUndefined(swaggerData["definitions"])){
        definitions=swaggerData["definitions"];
      }
    }
  }else{
    if (KUtils.checkUndefined(swaggerData)&& swaggerData.hasOwnProperty("components")) {
      var components=swaggerData["components"];
      if(KUtils.checkUndefined(components)&&components.hasOwnProperty("schemas")){
        var def=components["schemas"];
        if(KUtils.checkUndefined(def)){
          definitions=def;
        }
      }
    }
  }
  return definitions;

}
/***
 * 根据类名查找definition
 */
SwaggerBootstrapUiInstance.prototype.getDefinitionByName = function (name,oas) {
  var that = this;
  var def = null;
  that.difArrs.forEach(function (d) {
    if (d.name == name) {
      if(!d.init){
        d.init=true;
        that.analysisDefinitionAsync(this.currentInstance.swaggerData,d,oas);
      }
      def = d;
      return;
    }
  })
  return def;
}
/**
 * 释放内存,当分组切换时,置空，放弃全局搜索功能
 */
SwaggerBootstrapUiInstance.prototype.freeMemory=function(){
  //当前definistion数组
  // SwaggerBootstrapUiDefinition 集合
  this.difArrs = []
  //difinition的请求value缓存值
  //key-definiationName  -value :requestValue
  // add 2019-12-11 15:06:30
  this.definitionValues = {};
  //针对Swagger Models功能,再存一份SwaggerBootstrapUiDefinition集合
  this.swaggerModelsDifinitions = []
  //add 2019-12-11 20:08:51
  //存放treeTable已经递归查询过的schema值
  this.refTreeTableModels = {};
  //标签分类信息组
  //SwaggerBootstrapUiTag 集合
  this.tags = []
  //接口url信息
  //存储SwaggerBootstrapUiApiInfo 集合
  this.paths = []
  //字典
  this.pathsDictionary = {}
  //全局参数,存放SwaggerBootstrapUiParameter集合
  this.globalParameters = []
  //参数统计信息，存放SwaggerBootstrapUiPathCountDownLatch集合
  this.pathArrs = []
  //key-value方式存放
  //key-存放接口地址
  //value:存放实际值
  this.pathFilters = {}
  //权限信息
  this.securityArrs = []
  //Models
  this.models = []
  this.modelNames = []
  //新版本的models 适配antd的属性表格
  this.modelArrs = []
  this.firstLoad = true
  this.groupApis = []
  //缓存对象
  //this.cacheInstance=new SwaggerBootstrapUiCacheApis({id:this.groupId,name:this.name});
  this.cacheInstance = null
  //自定义文档
  this.markdownFiles = []
  this.i18n = null
}

function checkFiledExistsAndEqStr(object, filed, eq) {
  var flag = false
  if (object.hasOwnProperty(filed)) {
    if (object[filed] == eq) {
      flag = true
    }
  }
  return flag
}
/***
 * 控制台打印
 * @param msg
 */
SwaggerBootstrapUi.prototype.log = function (msg) {
  /* if (window.console) {
    //正式版不开启console功能
    window.console.log(msg)
  } */
}
SwaggerBootstrapUi.prototype.ajax=function(config,success,error){
  var ajax=DebugAxios.create();
  ajax.interceptors.response.use(response=>{
    var data = response.data;
    return data
  },error=>{
    return Promise.reject(error)
  })
  ajax.request(config).then(data=>{
    success(data);
  }).catch(err=>{
    error(err);
  })
}

/***
 * 错误异常输出
 * @param msg
 */
SwaggerBootstrapUi.prototype.error = function (msg) {
  if (window.console) {
    window.console.error(msg)
  }
}

export default SwaggerBootstrapUi
