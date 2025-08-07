/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.5.27-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: slurm_acct_db
-- ------------------------------------------------------
-- Server version	10.5.27-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `acct_coord_table`
--

DROP TABLE IF EXISTS `acct_coord_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `acct_coord_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `acct` tinytext NOT NULL,
  `user` tinytext NOT NULL,
  PRIMARY KEY (`acct`(42),`user`(42)),
  KEY `user` (`user`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acct_coord_table`
--

LOCK TABLES `acct_coord_table` WRITE;
/*!40000 ALTER TABLE `acct_coord_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `acct_coord_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acct_table`
--

DROP TABLE IF EXISTS `acct_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `acct_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `flags` int(10) unsigned DEFAULT 0,
  `name` tinytext NOT NULL,
  `description` text NOT NULL,
  `organization` text NOT NULL,
  PRIMARY KEY (`name`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acct_table`
--

LOCK TABLES `acct_table` WRITE;
/*!40000 ALTER TABLE `acct_table` DISABLE KEYS */;
INSERT INTO `acct_table` VALUES (1754540752,1754540752,0,0,'oit','office of information technology','oit'),(1754086818,1754086818,0,0,'root','default root account','root'),(1754540718,1754540718,0,0,'ucmerced','university of california, merced','ucmerced');
/*!40000 ALTER TABLE `acct_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clus_res_table`
--

DROP TABLE IF EXISTS `clus_res_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clus_res_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `cluster` tinytext NOT NULL,
  `res_id` int(11) NOT NULL,
  `allowed` int(10) unsigned DEFAULT 0,
  PRIMARY KEY (`res_id`,`cluster`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clus_res_table`
--

LOCK TABLES `clus_res_table` WRITE;
/*!40000 ALTER TABLE `clus_res_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `clus_res_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cluster_table`
--

DROP TABLE IF EXISTS `cluster_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cluster_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `name` tinytext NOT NULL,
  `id` smallint(6) DEFAULT NULL,
  `control_host` tinytext NOT NULL DEFAULT '',
  `control_port` int(10) unsigned NOT NULL DEFAULT 0,
  `last_port` int(10) unsigned NOT NULL DEFAULT 0,
  `rpc_version` smallint(5) unsigned NOT NULL DEFAULT 0,
  `classification` smallint(5) unsigned DEFAULT 0,
  `dimensions` smallint(5) unsigned DEFAULT 1,
  `flags` int(10) unsigned DEFAULT 0,
  `federation` tinytext NOT NULL,
  `features` text NOT NULL DEFAULT '',
  `fed_id` int(10) unsigned NOT NULL DEFAULT 0,
  `fed_state` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`name`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cluster_table`
--

LOCK TABLES `cluster_table` WRITE;
/*!40000 ALTER TABLE `cluster_table` DISABLE KEYS */;
INSERT INTO `cluster_table` VALUES (1754086820,1754545133,0,'localcluster',2986,'127.0.0.1',6817,6817,11008,0,1,0,'','',0,0);
/*!40000 ALTER TABLE `cluster_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `convert_version_table`
--

DROP TABLE IF EXISTS `convert_version_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `convert_version_table` (
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `version` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `convert_version_table`
--

LOCK TABLES `convert_version_table` WRITE;
/*!40000 ALTER TABLE `convert_version_table` DISABLE KEYS */;
INSERT INTO `convert_version_table` VALUES (0,16);
/*!40000 ALTER TABLE `convert_version_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `federation_table`
--

DROP TABLE IF EXISTS `federation_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `federation_table` (
  `creation_time` int(10) unsigned NOT NULL,
  `mod_time` int(10) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `name` tinytext NOT NULL,
  `flags` int(10) unsigned DEFAULT 0,
  PRIMARY KEY (`name`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `federation_table`
--

LOCK TABLES `federation_table` WRITE;
/*!40000 ALTER TABLE `federation_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `federation_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_assoc_table`
--

DROP TABLE IF EXISTS `localcluster_assoc_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_assoc_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `comment` text DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL DEFAULT 0,
  `is_def` tinyint(4) NOT NULL DEFAULT 0,
  `id_assoc` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` tinytext NOT NULL DEFAULT '',
  `acct` tinytext NOT NULL,
  `partition` tinytext NOT NULL DEFAULT '',
  `parent_acct` tinytext NOT NULL DEFAULT '',
  `id_parent` int(10) unsigned NOT NULL,
  `lineage` text DEFAULT NULL,
  `shares` int(11) NOT NULL DEFAULT 1,
  `max_jobs` int(11) DEFAULT NULL,
  `max_jobs_accrue` int(11) DEFAULT NULL,
  `min_prio_thresh` int(11) DEFAULT NULL,
  `max_submit_jobs` int(11) DEFAULT NULL,
  `max_tres_pj` text NOT NULL DEFAULT '',
  `max_tres_pn` text NOT NULL DEFAULT '',
  `max_tres_mins_pj` text NOT NULL DEFAULT '',
  `max_tres_run_mins` text NOT NULL DEFAULT '',
  `max_wall_pj` int(11) DEFAULT NULL,
  `grp_jobs` int(11) DEFAULT NULL,
  `grp_jobs_accrue` int(11) DEFAULT NULL,
  `grp_submit_jobs` int(11) DEFAULT NULL,
  `grp_tres` text NOT NULL DEFAULT '',
  `grp_tres_mins` text NOT NULL DEFAULT '',
  `grp_tres_run_mins` text NOT NULL DEFAULT '',
  `grp_wall` int(11) DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `def_qos_id` int(11) DEFAULT NULL,
  `qos` blob NOT NULL DEFAULT '',
  `delta_qos` blob NOT NULL DEFAULT '',
  PRIMARY KEY (`id_assoc`),
  UNIQUE KEY `udex` (`user`(42),`acct`(42),`partition`(42))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_assoc_table`
--

LOCK TABLES `localcluster_assoc_table` WRITE;
/*!40000 ALTER TABLE `localcluster_assoc_table` DISABLE KEYS */;
INSERT INTO `localcluster_assoc_table` VALUES (1754086820,1754086820,0,NULL,0,0,1,'','root','','',0,'/',1,NULL,NULL,NULL,NULL,'','','','',NULL,NULL,NULL,NULL,'','','',NULL,NULL,NULL,',1,',''),(1754086820,1754086820,0,NULL,131072,1,2,'root','root','','',1,'/0-root/',1,NULL,NULL,NULL,NULL,'','','','',NULL,NULL,NULL,NULL,'','','',NULL,NULL,NULL,'',''),(1754540718,1754540718,0,NULL,0,0,3,'','ucmerced','','root',1,'/ucmerced/',1,NULL,NULL,NULL,NULL,'','','','',NULL,NULL,NULL,NULL,'','','',NULL,NULL,NULL,'',''),(1754540752,1754540752,0,NULL,0,0,4,'','oit','','ucmerced',3,'/ucmerced/oit/',1,NULL,NULL,NULL,NULL,'','','','',NULL,NULL,NULL,NULL,'','','',NULL,NULL,NULL,'',''),(1754540800,1754540800,0,NULL,0,1,5,'rromero','oit','','',4,'/ucmerced/oit/0-rromero/',1,NULL,NULL,NULL,NULL,'','','','',NULL,NULL,NULL,NULL,'','','',NULL,NULL,NULL,'','');
/*!40000 ALTER TABLE `localcluster_assoc_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_assoc_usage_day_table`
--

DROP TABLE IF EXISTS `localcluster_assoc_usage_day_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_assoc_usage_day_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_assoc_usage_day_table`
--

LOCK TABLES `localcluster_assoc_usage_day_table` WRITE;
/*!40000 ALTER TABLE `localcluster_assoc_usage_day_table` DISABLE KEYS */;
INSERT INTO `localcluster_assoc_usage_day_table` VALUES (1754121600,1754121600,0,2,0,1,1754031600,11),(1754208000,1754208000,0,2,0,1,1754118000,64800),(1754318320,1754318320,0,2,0,1,1754204400,14434),(1754377200,1754377200,0,2,0,1,1754290800,7242),(1754550000,1754550000,0,2,0,1,1754463600,41504),(1754121600,1754121600,0,2,0,2,1754031600,1044406),(1754208000,1754208000,0,2,0,2,1754118000,341805600),(1754318320,1754318320,0,2,0,2,1754204400,649530000),(1754377200,1754377200,0,2,0,2,1754290800,325890000),(1754550000,1754550000,0,2,0,2,1754463600,960300000),(1754121600,1754121600,0,2,0,4,1754031600,11),(1754208000,1754208000,0,2,0,4,1754118000,3600),(1754318320,1754318320,0,2,0,4,1754204400,7217),(1754377200,1754377200,0,2,0,4,1754290800,3621),(1754550000,1754550000,0,2,0,4,1754463600,10670),(1754121600,1754121600,0,2,0,5,1754031600,11),(1754208000,1754208000,0,2,0,5,1754118000,64800),(1754318320,1754318320,0,2,0,5,1754204400,14434),(1754377200,1754377200,0,2,0,5,1754290800,7242),(1754550000,1754550000,0,2,0,5,1754463600,1398200),(1754550000,1754550000,0,2,0,1001,1754463600,3426),(1754550000,1754550000,0,2,0,1002,1754463600,3426),(1754550000,1754550000,0,5,0,1,1754463600,3606),(1754550000,1754550000,0,5,0,2,1754463600,324540000),(1754550000,1754550000,0,5,0,4,1754463600,3606),(1754550000,1754550000,0,5,0,5,1754463600,638262);
/*!40000 ALTER TABLE `localcluster_assoc_usage_day_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_assoc_usage_hour_table`
--

DROP TABLE IF EXISTS `localcluster_assoc_usage_hour_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_assoc_usage_hour_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_assoc_usage_hour_table`
--

LOCK TABLES `localcluster_assoc_usage_hour_table` WRITE;
/*!40000 ALTER TABLE `localcluster_assoc_usage_hour_table` DISABLE KEYS */;
INSERT INTO `localcluster_assoc_usage_hour_table` VALUES (1754092800,1754092800,0,2,0,1,1754085600,11),(1754179200,1754179200,0,2,0,1,1754175600,43092),(1754182800,1754182800,0,2,0,1,1754179200,21708),(1754276400,1754276400,0,2,0,1,1754272800,2148),(1754280000,1754280000,0,2,0,1,1754276400,5070),(1754283600,1754283600,0,2,0,1,1754280000,5470),(1754318319,1754318319,0,2,0,1,1754283600,1746),(1754323199,1754323199,0,2,0,1,1754316000,1912),(1754326799,1754326799,0,2,0,1,1754319600,5330),(1754496000,1754496000,0,2,0,1,1754488800,794),(1754496000,1754496000,0,2,0,1,1754492400,2831),(1754546400,1754546400,0,2,0,1,1754539200,3451),(1754546400,1754546400,0,2,0,1,1754542800,168),(1754550000,1754550000,0,2,0,1,1754546400,34260),(1754553600,1754553600,0,2,0,1,1754550000,2030),(1754092800,1754092800,0,2,0,2,1754085600,1044406),(1754179200,1754179200,0,2,0,2,1754175600,227300724),(1754182800,1754182800,0,2,0,2,1754179200,114504876),(1754276400,1754276400,0,2,0,2,1754272800,96660000),(1754280000,1754280000,0,2,0,2,1754276400,228150000),(1754283600,1754283600,0,2,0,2,1754280000,246150000),(1754318319,1754318319,0,2,0,2,1754283600,78570000),(1754323199,1754323199,0,2,0,2,1754316000,86040000),(1754326799,1754326799,0,2,0,2,1754319600,239850000),(1754496000,1754496000,0,2,0,2,1754488800,71460000),(1754496000,1754496000,0,2,0,2,1754492400,254790000),(1754546400,1754546400,0,2,0,2,1754539200,310590000),(1754546400,1754546400,0,2,0,2,1754542800,15120000),(1754550000,1754550000,0,2,0,2,1754546400,308340000),(1754553600,1754553600,0,2,0,2,1754550000,18270000),(1754092800,1754092800,0,2,0,4,1754085600,11),(1754179200,1754179200,0,2,0,4,1754175600,2394),(1754182800,1754182800,0,2,0,4,1754179200,1206),(1754276400,1754276400,0,2,0,4,1754272800,1074),(1754280000,1754280000,0,2,0,4,1754276400,2535),(1754283600,1754283600,0,2,0,4,1754280000,2735),(1754318319,1754318319,0,2,0,4,1754283600,873),(1754323199,1754323199,0,2,0,4,1754316000,956),(1754326799,1754326799,0,2,0,4,1754319600,2665),(1754496000,1754496000,0,2,0,4,1754488800,794),(1754496000,1754496000,0,2,0,4,1754492400,2831),(1754546400,1754546400,0,2,0,4,1754539200,3451),(1754546400,1754546400,0,2,0,4,1754542800,168),(1754550000,1754550000,0,2,0,4,1754546400,3426),(1754553600,1754553600,0,2,0,4,1754550000,203),(1754092800,1754092800,0,2,0,5,1754085600,11),(1754179200,1754179200,0,2,0,5,1754175600,43092),(1754182800,1754182800,0,2,0,5,1754179200,21708),(1754276400,1754276400,0,2,0,5,1754272800,2148),(1754280000,1754280000,0,2,0,5,1754276400,5070),(1754283600,1754283600,0,2,0,5,1754280000,5470),(1754318319,1754318319,0,2,0,5,1754283600,1746),(1754323199,1754323199,0,2,0,5,1754316000,1912),(1754326799,1754326799,0,2,0,5,1754319600,5330),(1754496000,1754496000,0,2,0,5,1754488800,794),(1754496000,1754496000,0,2,0,5,1754492400,2831),(1754546400,1754546400,0,2,0,5,1754539200,3451),(1754546400,1754546400,0,2,0,5,1754542800,168),(1754550000,1754550000,0,2,0,5,1754546400,1390956),(1754553600,1754553600,0,2,0,5,1754550000,82418),(1754550000,1754550000,0,2,0,1001,1754546400,3426),(1754553600,1754553600,0,2,0,1001,1754550000,203),(1754550000,1754550000,0,2,0,1002,1754546400,3426),(1754553600,1754553600,0,2,0,1002,1754550000,203),(1754546400,1754546400,0,5,0,1,1754542800,3432),(1754550000,1754550000,0,5,0,1,1754546400,174),(1754553600,1754553600,0,5,0,1,1754550000,6794),(1754557200,1754557200,0,5,0,1,1754553600,406),(1754546400,1754546400,0,5,0,2,1754542800,308880000),(1754550000,1754550000,0,5,0,2,1754546400,15660000),(1754553600,1754553600,0,5,0,2,1754550000,30573000),(1754557200,1754557200,0,5,0,2,1754553600,1827000),(1754546400,1754546400,0,5,0,4,1754542800,3432),(1754550000,1754550000,0,5,0,4,1754546400,174),(1754553600,1754553600,0,5,0,4,1754550000,6794),(1754557200,1754557200,0,5,0,4,1754553600,406),(1754546400,1754546400,0,5,0,5,1754542800,607464),(1754550000,1754550000,0,5,0,5,1754546400,30798),(1754553600,1754553600,0,5,0,5,1754550000,135880),(1754557200,1754557200,0,5,0,5,1754553600,8120);
/*!40000 ALTER TABLE `localcluster_assoc_usage_hour_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_assoc_usage_month_table`
--

DROP TABLE IF EXISTS `localcluster_assoc_usage_month_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_assoc_usage_month_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_assoc_usage_month_table`
--

LOCK TABLES `localcluster_assoc_usage_month_table` WRITE;
/*!40000 ALTER TABLE `localcluster_assoc_usage_month_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_assoc_usage_month_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_event_table`
--

DROP TABLE IF EXISTS `localcluster_event_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_event_table` (
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `time_start` bigint(20) unsigned NOT NULL,
  `time_end` bigint(20) unsigned NOT NULL DEFAULT 0,
  `node_name` tinytext NOT NULL DEFAULT '',
  `extra` text DEFAULT NULL,
  `cluster_nodes` text NOT NULL DEFAULT '',
  `instance_id` text DEFAULT NULL,
  `instance_type` text DEFAULT NULL,
  `reason` tinytext NOT NULL,
  `reason_uid` int(10) unsigned NOT NULL DEFAULT 4294967294,
  `state` int(10) unsigned NOT NULL DEFAULT 0,
  `tres` text NOT NULL DEFAULT '',
  PRIMARY KEY (`node_name`(42),`time_start`),
  KEY `rollup` (`time_start`,`time_end`,`state`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`time_end`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_event_table`
--

LOCK TABLES `localcluster_event_table` WRITE;
/*!40000 ALTER TABLE `localcluster_event_table` DISABLE KEYS */;
INSERT INTO `localcluster_event_table` VALUES (0,1754086820,1754274795,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=94946,3=0,4=1,5=20,6=0,7=0,8=0'),(0,1754274795,1754541686,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=90000,3=0,4=1,5=20,6=0,7=0,8=0'),(0,1754541686,1754541858,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=90000,3=0,4=1,5=20,6=0,7=0,8=0,1001=0,1002=0,1003=0,1004=0'),(0,1754541858,1754544468,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=90000,3=0,4=1,5=215,6=0,7=0,8=0,1001=0,1002=0,1003=0,1004=0'),(0,1754544468,1754545121,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=90000,3=0,4=1,5=215,6=0,7=0,8=0,1001=1,1002=1,1003=0,1004=0'),(0,1754545121,0,'',NULL,'hostage',NULL,NULL,'Cluster Registered TRES',4294967294,0,'1=20,2=90000,3=0,4=1,5=416,6=0,7=0,8=0,1001=1,1002=1,1003=0,1004=0'),(0,1754318399,1754318520,'hostage',NULL,'',NULL,NULL,'Not responding',976,2049,'1=20,2=90000,5=20'),(0,1754318520,1754318641,'hostage',NULL,'',NULL,NULL,'Node unexpectedly rebooted',976,1,'1=20,2=90000,5=20');
/*!40000 ALTER TABLE `localcluster_event_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_job_env_table`
--

DROP TABLE IF EXISTS `localcluster_job_env_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_job_env_table` (
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `hash_inx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `last_used` timestamp NOT NULL DEFAULT current_timestamp(),
  `env_hash` text NOT NULL,
  `env_vars` longtext DEFAULT NULL,
  PRIMARY KEY (`hash_inx`),
  UNIQUE KEY `env_hash_inx` (`env_hash`(66)),
  KEY `archive_delete` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_job_env_table`
--

LOCK TABLES `localcluster_job_env_table` WRITE;
/*!40000 ALTER TABLE `localcluster_job_env_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_job_env_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_job_script_table`
--

DROP TABLE IF EXISTS `localcluster_job_script_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_job_script_table` (
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `hash_inx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `last_used` timestamp NOT NULL DEFAULT current_timestamp(),
  `script_hash` text NOT NULL,
  `batch_script` longtext DEFAULT NULL,
  PRIMARY KEY (`hash_inx`),
  UNIQUE KEY `script_hash_inx` (`script_hash`(66)),
  KEY `archive_delete` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_job_script_table`
--

LOCK TABLES `localcluster_job_script_table` WRITE;
/*!40000 ALTER TABLE `localcluster_job_script_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_job_script_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_job_table`
--

DROP TABLE IF EXISTS `localcluster_job_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_job_table` (
  `job_db_inx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `account` tinytext DEFAULT NULL,
  `admin_comment` text DEFAULT NULL,
  `array_task_str` text DEFAULT NULL,
  `array_max_tasks` int(10) unsigned NOT NULL DEFAULT 0,
  `array_task_pending` int(10) unsigned NOT NULL DEFAULT 0,
  `constraints` text DEFAULT '',
  `container` text DEFAULT NULL,
  `cpus_req` int(10) unsigned NOT NULL,
  `derived_ec` int(10) unsigned NOT NULL DEFAULT 0,
  `derived_es` text DEFAULT NULL,
  `env_hash_inx` bigint(20) unsigned NOT NULL DEFAULT 0,
  `exit_code` int(10) unsigned NOT NULL DEFAULT 0,
  `extra` text DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL DEFAULT 0,
  `failed_node` tinytext DEFAULT NULL,
  `job_name` tinytext NOT NULL,
  `id_assoc` int(10) unsigned NOT NULL,
  `id_array_job` int(10) unsigned NOT NULL DEFAULT 0,
  `id_array_task` int(10) unsigned NOT NULL DEFAULT 4294967294,
  `id_block` tinytext DEFAULT NULL,
  `id_job` int(10) unsigned NOT NULL,
  `id_qos` int(10) unsigned NOT NULL DEFAULT 0,
  `id_resv` int(10) unsigned NOT NULL,
  `id_wckey` int(10) unsigned NOT NULL,
  `id_user` int(10) unsigned NOT NULL,
  `id_group` int(10) unsigned NOT NULL,
  `het_job_id` int(10) unsigned NOT NULL,
  `het_job_offset` int(10) unsigned NOT NULL,
  `kill_requid` int(10) unsigned DEFAULT NULL,
  `state_reason_prev` int(10) unsigned NOT NULL,
  `licenses` text DEFAULT NULL,
  `mcs_label` tinytext DEFAULT '',
  `mem_req` bigint(20) unsigned NOT NULL DEFAULT 0,
  `nodelist` text DEFAULT NULL,
  `nodes_alloc` int(10) unsigned NOT NULL,
  `node_inx` text DEFAULT NULL,
  `partition` tinytext NOT NULL,
  `priority` int(10) unsigned NOT NULL,
  `qos_req` text DEFAULT NULL,
  `restart_cnt` smallint(5) unsigned DEFAULT 0,
  `resv_req` text DEFAULT NULL,
  `script_hash_inx` bigint(20) unsigned NOT NULL DEFAULT 0,
  `state` int(10) unsigned NOT NULL,
  `timelimit` int(10) unsigned NOT NULL DEFAULT 0,
  `time_submit` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_eligible` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_start` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_end` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_suspended` bigint(20) unsigned NOT NULL DEFAULT 0,
  `gres_used` text NOT NULL DEFAULT '',
  `wckey` tinytext NOT NULL DEFAULT '',
  `work_dir` text NOT NULL DEFAULT '',
  `segment_size` smallint(5) unsigned NOT NULL DEFAULT 0,
  `std_err` text NOT NULL DEFAULT '',
  `std_in` text NOT NULL DEFAULT '',
  `std_out` text NOT NULL DEFAULT '',
  `submit_line` longtext DEFAULT NULL,
  `system_comment` text DEFAULT NULL,
  `tres_alloc` text NOT NULL DEFAULT '',
  `tres_req` text NOT NULL DEFAULT '',
  PRIMARY KEY (`job_db_inx`),
  UNIQUE KEY `id_job` (`id_job`,`time_submit`),
  KEY `old_tuple` (`id_job`,`id_assoc`,`time_submit`),
  KEY `rollup` (`time_eligible`,`time_end`),
  KEY `rollup2` (`time_end`,`time_eligible`),
  KEY `nodes_alloc` (`nodes_alloc`),
  KEY `wckey` (`id_wckey`),
  KEY `qos` (`id_qos`),
  KEY `association` (`id_assoc`),
  KEY `array_job` (`id_array_job`),
  KEY `het_job` (`het_job_id`),
  KEY `reserv` (`id_resv`),
  KEY `sacct_def` (`id_user`,`time_start`,`time_end`),
  KEY `sacct_def2` (`id_user`,`time_end`,`time_eligible`),
  KEY `env_hash_inx` (`env_hash_inx`),
  KEY `script_hash_inx` (`script_hash_inx`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`time_end`)
) ENGINE=InnoDB AUTO_INCREMENT=13449545141744181249 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_job_table`
--

LOCK TABLES `localcluster_job_table` WRITE;
/*!40000 ALTER TABLE `localcluster_job_table` DISABLE KEYS */;
INSERT INTO `localcluster_job_table` VALUES (13449544672876986368,1754087449,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,18,NULL,'hostname',2,0,4294967294,NULL,1,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,3,4294967295,1754087449,1754087449,1754087449,1754087449,0,'','','/root',0,'','','','srun -N1 hostname',NULL,'1=1,2=94946,3=18446744073709551614,4=1,5=1','1=1,2=94946,4=1,5=1'),(13449544674365179904,1754088903,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,18,NULL,'hostname',2,0,4294967294,NULL,2,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,3,4294967295,1754088903,1754088903,1754088903,1754088903,0,'','','/root/SlurmCostManager',0,'','','','srun -N1 hostname',NULL,'1=1,2=94946,3=18446744073709551614,4=1,5=1','1=1,2=94946,4=1,5=1'),(13449544674499264512,1754089045,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'slurm_test',2,0,4294967294,NULL,3,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,3,2,1754089034,1754089034,1754089034,1754089045,0,'','','/root',0,'/root/slurm_test.%j.err','/dev/null','/root/slurm_test.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=94946,3=18446744073709551614,4=1,5=1','1=1,2=94946,4=1,5=1'),(13449544764378132480,1754180406,0,'root',NULL,NULL,0,0,'',NULL,18,0,NULL,0,0,NULL,24,NULL,'slurm_test',2,0,4294967294,NULL,4,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754176806,1754176806,1754176806,1754180406,0,'','','/root/SlurmCostManager',0,'/root/SlurmCostManager/slurm_test.%j.err','/dev/null','/root/SlurmCostManager/slurm_test.%j.out','sbatch ../test_sbatch.sub',NULL,'1=18,2=94946,3=18446744073709551614,4=1,5=18','1=18,2=94946,4=1,5=18'),(13449544865262720000,1754278936,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,5,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754275326,1754275326,1754275326,1754278935,0,'','','/root',0,'/root/one_core_hour.%j.err','/dev/null','/root/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=2,2=90000,3=18446744073709551614,4=1,5=2','1=1,2=90000,4=1,5=1'),(13449544870934334464,1754284473,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,6,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754280865,1754280865,1754280865,1754284473,0,'','','/root',0,'/root/one_core_hour.%j.err','/dev/null','/root/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=2,2=90000,3=18446744073709551614,4=1,5=2','1=1,2=90000,4=1,5=1'),(13449544909511501824,1754322266,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,7,1,0,0,0,0,0,4294967294,NULL,15,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754318538,1754318538,1754318644,1754322265,0,'','','/root',0,'/root/one_core_hour.%j.err','/dev/null','/root/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=2,2=90000,3=18446744073709551614,4=1,5=2','1=1,2=90000,4=1,5=1'),(13449545086733025280,1754495231,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,8,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754491606,1754491606,1754491606,1754495231,0,'','','/root',0,'/root/one_core_hour.%j.err','/dev/null','/root/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=90000,3=18446744073709551614,4=1,5=1','1=1,2=90000,4=1,5=1'),(13449545135622212608,1754542968,0,'root',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,9,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754539349,1754539349,1754539349,1754542968,0,'','','/root',0,'/root/one_core_hour.%j.err','/dev/null','/root/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=90000,3=18446744073709551614,4=1,5=1','1=1,2=90000,4=1,5=1'),(13449545137233928192,1754546574,0,'oit',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',5,0,4294967294,NULL,10,1,0,0,1000,1000,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754540923,1754540923,1754542968,1754546574,0,'','','/home/rromero',0,'/home/rromero/one_core_hour.%j.err','/dev/null','/home/rromero/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=90000,3=18446744073709551614,4=1,5=177','1=1,2=90000,4=1,5=1'),(13449545141473019904,1754550203,0,'root',NULL,NULL,0,0,'',NULL,10,0,NULL,0,0,NULL,20,NULL,'one_core_hour',2,0,4294967294,NULL,11,1,0,0,0,0,0,4294967294,NULL,0,NULL,'',0,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754545063,1754545063,1754546574,1754550203,0,'','','/root/SlurmCostManager',0,'/root/SlurmCostManager/one_core_hour.%j.err','/dev/null','/root/SlurmCostManager/one_core_hour.%j.out','sbatch ../test_sbatch.sub',NULL,'1=10,2=90000,3=18446744073709551614,4=1,5=406,1001=1,1002=1','1=10,2=90000,4=1,5=195,1001=1'),(13449545141743028224,1754553803,0,'oit',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',5,0,4294967294,NULL,12,1,0,0,1000,1000,0,4294967294,NULL,0,NULL,'',9223372036854780308,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754545326,1754545326,1754550203,1754553803,0,'','','/home/rromero',0,'/home/rromero/one_core_hour.%j.err','/dev/null','/home/rromero/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=4500,3=18446744073709551614,4=1,5=20','1=1,2=4500,4=1,5=20'),(13449545141744181248,1754553803,0,'oit',NULL,NULL,0,0,'',NULL,1,0,NULL,0,0,NULL,20,NULL,'one_core_hour',5,0,4294967294,NULL,13,1,0,0,1000,1000,0,4294967294,NULL,0,NULL,'',9223372036854780308,'hostage',1,'0','debug',1,NULL,0,NULL,0,6,60,1754545328,1754545328,1754550203,1754553803,0,'','','/home/rromero',0,'/home/rromero/one_core_hour.%j.err','/dev/null','/home/rromero/one_core_hour.%j.out','sbatch test_sbatch.sub',NULL,'1=1,2=4500,3=18446744073709551614,4=1,5=20','1=1,2=4500,4=1,5=20');
/*!40000 ALTER TABLE `localcluster_job_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_last_ran_table`
--

DROP TABLE IF EXISTS `localcluster_last_ran_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_last_ran_table` (
  `hourly_rollup` bigint(20) unsigned NOT NULL DEFAULT 0,
  `daily_rollup` bigint(20) unsigned NOT NULL DEFAULT 0,
  `monthly_rollup` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`hourly_rollup`,`daily_rollup`,`monthly_rollup`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_last_ran_table`
--

LOCK TABLES `localcluster_last_ran_table` WRITE;
/*!40000 ALTER TABLE `localcluster_last_ran_table` DISABLE KEYS */;
INSERT INTO `localcluster_last_ran_table` VALUES (1754571600,1754550000,1754086820);
/*!40000 ALTER TABLE `localcluster_last_ran_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_qos_usage_day_table`
--

DROP TABLE IF EXISTS `localcluster_qos_usage_day_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_qos_usage_day_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_alt`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_qos_usage_day_table`
--

LOCK TABLES `localcluster_qos_usage_day_table` WRITE;
/*!40000 ALTER TABLE `localcluster_qos_usage_day_table` DISABLE KEYS */;
INSERT INTO `localcluster_qos_usage_day_table` VALUES (1754121600,1754121600,0,2,1,1,1754031600,11),(1754208000,1754208000,0,2,1,1,1754118000,64800),(1754318320,1754318320,0,2,1,1,1754204400,14434),(1754377200,1754377200,0,2,1,1,1754290800,7242),(1754550000,1754550000,0,2,1,1,1754463600,41504),(1754121600,1754121600,0,2,1,2,1754031600,1044406),(1754208000,1754208000,0,2,1,2,1754118000,341805600),(1754318320,1754318320,0,2,1,2,1754204400,649530000),(1754377200,1754377200,0,2,1,2,1754290800,325890000),(1754550000,1754550000,0,2,1,2,1754463600,960300000),(1754121600,1754121600,0,2,1,4,1754031600,11),(1754208000,1754208000,0,2,1,4,1754118000,3600),(1754318320,1754318320,0,2,1,4,1754204400,7217),(1754377200,1754377200,0,2,1,4,1754290800,3621),(1754550000,1754550000,0,2,1,4,1754463600,10670),(1754121600,1754121600,0,2,1,5,1754031600,11),(1754208000,1754208000,0,2,1,5,1754118000,64800),(1754318320,1754318320,0,2,1,5,1754204400,14434),(1754377200,1754377200,0,2,1,5,1754290800,7242),(1754550000,1754550000,0,2,1,5,1754463600,1398200),(1754550000,1754550000,0,2,1,1001,1754463600,3426),(1754550000,1754550000,0,2,1,1002,1754463600,3426),(1754550000,1754550000,0,5,1,1,1754463600,3606),(1754550000,1754550000,0,5,1,2,1754463600,324540000),(1754550000,1754550000,0,5,1,4,1754463600,3606),(1754550000,1754550000,0,5,1,5,1754463600,638262);
/*!40000 ALTER TABLE `localcluster_qos_usage_day_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_qos_usage_hour_table`
--

DROP TABLE IF EXISTS `localcluster_qos_usage_hour_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_qos_usage_hour_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_alt`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_qos_usage_hour_table`
--

LOCK TABLES `localcluster_qos_usage_hour_table` WRITE;
/*!40000 ALTER TABLE `localcluster_qos_usage_hour_table` DISABLE KEYS */;
INSERT INTO `localcluster_qos_usage_hour_table` VALUES (1754092800,1754092800,0,2,1,1,1754085600,11),(1754179200,1754179200,0,2,1,1,1754175600,43092),(1754182800,1754182800,0,2,1,1,1754179200,21708),(1754276400,1754276400,0,2,1,1,1754272800,2148),(1754280000,1754280000,0,2,1,1,1754276400,5070),(1754283600,1754283600,0,2,1,1,1754280000,5470),(1754318319,1754318319,0,2,1,1,1754283600,1746),(1754323199,1754323199,0,2,1,1,1754316000,1912),(1754326799,1754326799,0,2,1,1,1754319600,5330),(1754496000,1754496000,0,2,1,1,1754488800,794),(1754496000,1754496000,0,2,1,1,1754492400,2831),(1754546400,1754546400,0,2,1,1,1754539200,3451),(1754546400,1754546400,0,2,1,1,1754542800,168),(1754550000,1754550000,0,2,1,1,1754546400,34260),(1754553600,1754553600,0,2,1,1,1754550000,2030),(1754092800,1754092800,0,2,1,2,1754085600,1044406),(1754179200,1754179200,0,2,1,2,1754175600,227300724),(1754182800,1754182800,0,2,1,2,1754179200,114504876),(1754276400,1754276400,0,2,1,2,1754272800,96660000),(1754280000,1754280000,0,2,1,2,1754276400,228150000),(1754283600,1754283600,0,2,1,2,1754280000,246150000),(1754318319,1754318319,0,2,1,2,1754283600,78570000),(1754323199,1754323199,0,2,1,2,1754316000,86040000),(1754326799,1754326799,0,2,1,2,1754319600,239850000),(1754496000,1754496000,0,2,1,2,1754488800,71460000),(1754496000,1754496000,0,2,1,2,1754492400,254790000),(1754546400,1754546400,0,2,1,2,1754539200,310590000),(1754546400,1754546400,0,2,1,2,1754542800,15120000),(1754550000,1754550000,0,2,1,2,1754546400,308340000),(1754553600,1754553600,0,2,1,2,1754550000,18270000),(1754092800,1754092800,0,2,1,4,1754085600,11),(1754179200,1754179200,0,2,1,4,1754175600,2394),(1754182800,1754182800,0,2,1,4,1754179200,1206),(1754276400,1754276400,0,2,1,4,1754272800,1074),(1754280000,1754280000,0,2,1,4,1754276400,2535),(1754283600,1754283600,0,2,1,4,1754280000,2735),(1754318319,1754318319,0,2,1,4,1754283600,873),(1754323199,1754323199,0,2,1,4,1754316000,956),(1754326799,1754326799,0,2,1,4,1754319600,2665),(1754496000,1754496000,0,2,1,4,1754488800,794),(1754496000,1754496000,0,2,1,4,1754492400,2831),(1754546400,1754546400,0,2,1,4,1754539200,3451),(1754546400,1754546400,0,2,1,4,1754542800,168),(1754550000,1754550000,0,2,1,4,1754546400,3426),(1754553600,1754553600,0,2,1,4,1754550000,203),(1754092800,1754092800,0,2,1,5,1754085600,11),(1754179200,1754179200,0,2,1,5,1754175600,43092),(1754182800,1754182800,0,2,1,5,1754179200,21708),(1754276400,1754276400,0,2,1,5,1754272800,2148),(1754280000,1754280000,0,2,1,5,1754276400,5070),(1754283600,1754283600,0,2,1,5,1754280000,5470),(1754318319,1754318319,0,2,1,5,1754283600,1746),(1754323199,1754323199,0,2,1,5,1754316000,1912),(1754326799,1754326799,0,2,1,5,1754319600,5330),(1754496000,1754496000,0,2,1,5,1754488800,794),(1754496000,1754496000,0,2,1,5,1754492400,2831),(1754546400,1754546400,0,2,1,5,1754539200,3451),(1754546400,1754546400,0,2,1,5,1754542800,168),(1754550000,1754550000,0,2,1,5,1754546400,1390956),(1754553600,1754553600,0,2,1,5,1754550000,82418),(1754550000,1754550000,0,2,1,1001,1754546400,3426),(1754553600,1754553600,0,2,1,1001,1754550000,203),(1754550000,1754550000,0,2,1,1002,1754546400,3426),(1754553600,1754553600,0,2,1,1002,1754550000,203),(1754546400,1754546400,0,5,1,1,1754542800,3432),(1754550000,1754550000,0,5,1,1,1754546400,174),(1754553600,1754553600,0,5,1,1,1754550000,6794),(1754557200,1754557200,0,5,1,1,1754553600,406),(1754546400,1754546400,0,5,1,2,1754542800,308880000),(1754550000,1754550000,0,5,1,2,1754546400,15660000),(1754553600,1754553600,0,5,1,2,1754550000,30573000),(1754557200,1754557200,0,5,1,2,1754553600,1827000),(1754546400,1754546400,0,5,1,4,1754542800,3432),(1754550000,1754550000,0,5,1,4,1754546400,174),(1754553600,1754553600,0,5,1,4,1754550000,6794),(1754557200,1754557200,0,5,1,4,1754553600,406),(1754546400,1754546400,0,5,1,5,1754542800,607464),(1754550000,1754550000,0,5,1,5,1754546400,30798),(1754553600,1754553600,0,5,1,5,1754550000,135880),(1754557200,1754557200,0,5,1,5,1754553600,8120);
/*!40000 ALTER TABLE `localcluster_qos_usage_hour_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_qos_usage_month_table`
--

DROP TABLE IF EXISTS `localcluster_qos_usage_month_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_qos_usage_month_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_alt`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_qos_usage_month_table`
--

LOCK TABLES `localcluster_qos_usage_month_table` WRITE;
/*!40000 ALTER TABLE `localcluster_qos_usage_month_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_qos_usage_month_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_resv_table`
--

DROP TABLE IF EXISTS `localcluster_resv_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_resv_table` (
  `id_resv` int(10) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `assoclist` text NOT NULL DEFAULT '',
  `flags` bigint(20) unsigned NOT NULL DEFAULT 0,
  `nodelist` text NOT NULL DEFAULT '',
  `node_inx` text NOT NULL DEFAULT '',
  `resv_name` text NOT NULL,
  `time_start` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_end` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_force` bigint(20) unsigned NOT NULL DEFAULT 0,
  `tres` text NOT NULL DEFAULT '',
  `unused_wall` double unsigned NOT NULL DEFAULT 0,
  `comment` text DEFAULT NULL,
  PRIMARY KEY (`id_resv`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`time_end`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_resv_table`
--

LOCK TABLES `localcluster_resv_table` WRITE;
/*!40000 ALTER TABLE `localcluster_resv_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_resv_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_step_table`
--

DROP TABLE IF EXISTS `localcluster_step_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_step_table` (
  `job_db_inx` bigint(20) unsigned NOT NULL,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `exit_code` int(11) NOT NULL DEFAULT 0,
  `id_step` int(11) NOT NULL,
  `step_het_comp` int(10) unsigned NOT NULL DEFAULT 4294967294,
  `kill_requid` int(10) unsigned DEFAULT NULL,
  `nodelist` text NOT NULL,
  `nodes_alloc` int(10) unsigned NOT NULL,
  `node_inx` text DEFAULT NULL,
  `state` smallint(5) unsigned NOT NULL,
  `step_name` text NOT NULL,
  `task_cnt` int(10) unsigned NOT NULL,
  `task_dist` int(11) NOT NULL DEFAULT 0,
  `time_start` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_end` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_suspended` bigint(20) unsigned NOT NULL DEFAULT 0,
  `timelimit` int(10) unsigned NOT NULL DEFAULT 0,
  `user_sec` bigint(20) unsigned NOT NULL DEFAULT 0,
  `user_usec` int(10) unsigned NOT NULL DEFAULT 0,
  `sys_sec` bigint(20) unsigned NOT NULL DEFAULT 0,
  `sys_usec` int(10) unsigned NOT NULL DEFAULT 0,
  `act_cpufreq` double unsigned NOT NULL DEFAULT 0,
  `consumed_energy` bigint(20) unsigned NOT NULL DEFAULT 0,
  `container` text DEFAULT NULL,
  `req_cpufreq_min` int(10) unsigned NOT NULL DEFAULT 0,
  `req_cpufreq` int(10) unsigned NOT NULL DEFAULT 0,
  `req_cpufreq_gov` int(10) unsigned NOT NULL DEFAULT 0,
  `cwd` text NOT NULL DEFAULT '',
  `std_err` text NOT NULL DEFAULT '',
  `std_in` text NOT NULL DEFAULT '',
  `std_out` text NOT NULL DEFAULT '',
  `submit_line` longtext DEFAULT NULL,
  `tres_alloc` text NOT NULL DEFAULT '',
  `tres_usage_in_ave` text NOT NULL DEFAULT '',
  `tres_usage_in_max` text NOT NULL DEFAULT '',
  `tres_usage_in_max_taskid` text NOT NULL DEFAULT '',
  `tres_usage_in_max_nodeid` text NOT NULL DEFAULT '',
  `tres_usage_in_min` text NOT NULL DEFAULT '',
  `tres_usage_in_min_taskid` text NOT NULL DEFAULT '',
  `tres_usage_in_min_nodeid` text NOT NULL DEFAULT '',
  `tres_usage_in_tot` text NOT NULL DEFAULT '',
  `tres_usage_out_ave` text NOT NULL DEFAULT '',
  `tres_usage_out_max` text NOT NULL DEFAULT '',
  `tres_usage_out_max_taskid` text NOT NULL DEFAULT '',
  `tres_usage_out_max_nodeid` text NOT NULL DEFAULT '',
  `tres_usage_out_min` text NOT NULL DEFAULT '',
  `tres_usage_out_min_taskid` text NOT NULL DEFAULT '',
  `tres_usage_out_min_nodeid` text NOT NULL DEFAULT '',
  `tres_usage_out_tot` text NOT NULL DEFAULT '',
  PRIMARY KEY (`job_db_inx`,`id_step`,`step_het_comp`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`time_end`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_step_table`
--

LOCK TABLES `localcluster_step_table` WRITE;
/*!40000 ALTER TABLE `localcluster_step_table` DISABLE KEYS */;
INSERT INTO `localcluster_step_table` VALUES (13449544672876986368,0,0,0,4294967294,NULL,'hostage',1,'0',3,'hostname',1,2,1754087449,1754087449,0,4294967295,0,0,0,0,0,0,NULL,4294967294,4294967294,4294967294,'/root','','','','srun -N1 hostname','1=1,2=94946,4=1','','','','','','','','','','','','','','','',''),(13449544674365179904,0,0,0,4294967294,NULL,'hostage',1,'0',3,'hostname',1,2,1754088903,1754088903,0,4294967295,0,0,0,0,0,0,NULL,4294967294,4294967294,4294967294,'/root/SlurmCostManager','','','','srun -N1 hostname','1=1,2=94946,4=1','','','','','','','','','','','','','','','',''),(13449544674499264512,0,0,-5,4294967294,NULL,'hostage',1,'0',3,'batch',1,0,1754089034,1754089045,0,4294967295,0,0,0,0,0,0,NULL,0,0,0,'','','','',NULL,'1=1,2=94946,4=1','','','','','','','','','','','','','','','',''),(13449544764378132480,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754176806,1754180406,0,4294967295,0,0,0,0,0,0,NULL,0,0,0,'','','','',NULL,'1=18,2=94946,4=1','','','','','','','','','','','','','','','',''),(13449544865262720000,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754275326,1754278936,0,4294967295,3598,788737,0,472102,412,0,NULL,0,0,0,'','','','',NULL,'1=2,2=90000,4=1','1=3599260,2=1130496,3=0,6=25414,7=0,8=0','1=3599260,2=1130496,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3599260,2=1130496,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3599260,2=1130496,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449544870934334464,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754280865,1754284473,0,4294967295,3597,224997,0,120919,729,0,NULL,0,0,0,'','','','',NULL,'1=2,2=90000,4=1','1=3597345,2=1122304,3=0,6=25414,7=0,8=0','1=3597345,2=1122304,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3597345,2=1122304,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3597345,2=1122304,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449544909511501824,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754318644,1754322266,0,4294967295,3610,723865,0,143376,519,0,NULL,0,0,0,'','','','',NULL,'1=2,2=90000,4=1','1=3610866,2=1097728,3=0,6=25414,7=0,8=0','1=3610866,2=1097728,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3610866,2=1097728,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3610866,2=1097728,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545086733025280,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754491606,1754495231,0,4294967295,3613,948155,0,145040,510,0,NULL,0,0,0,'','','','',NULL,'1=1,2=90000,4=1','1=3614092,2=1122304,3=0,6=25414,7=0,8=0','1=3614092,2=1122304,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3614092,2=1122304,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3614092,2=1122304,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545135622212608,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754539349,1754542968,0,4294967295,3607,896037,0,163637,693,0,NULL,0,0,0,'','','','',NULL,'1=1,2=90000,4=1','1=3608059,2=1134592,3=0,6=25414,7=0,8=0','1=3608059,2=1134592,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3608059,2=1134592,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3608059,2=1134592,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545137233928192,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754542968,1754546574,0,4294967295,3595,729397,0,392098,680,0,NULL,0,0,0,'','','','',NULL,'1=1,2=90000,4=1','1=3596120,2=1114112,3=0,6=25414,7=0,8=0','1=3596120,2=1114112,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3596120,2=1114112,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3596120,2=1114112,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545141473019904,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754546574,1754550203,0,4294967295,3619,291214,0,125322,427,0,NULL,0,0,0,'','','','',NULL,'1=10,2=90000,4=1,1001=1,1002=1','1=3619416,2=1032192,3=0,6=25435,7=0,8=0','1=3619416,2=1032192,3=0,6=25435,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3619416,2=1032192,3=0,6=25435,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3619416,2=1032192,3=0,6=25435,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545141743028224,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754550203,1754553803,0,4294967295,3588,433286,0,128854,602,0,NULL,0,0,0,'','','','',NULL,'1=1,2=4500,4=1','1=3588561,2=1081344,3=0,6=25414,7=0,8=0','1=3588561,2=1081344,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3588561,2=1081344,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3588561,2=1081344,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99'),(13449545141744181248,0,15,-5,4294967294,NULL,'hostage',1,'0',4,'batch',1,0,1754550203,1754553803,0,4294967295,3589,437695,0,6872,602,0,NULL,0,0,0,'','','','',NULL,'1=1,2=4500,4=1','1=3589443,2=1105920,3=0,6=25414,7=0,8=0','1=3589443,2=1105920,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3589443,2=1105920,3=0,6=25414,7=0,8=0','1=0,2=0,6=0,7=0,8=0','1=0,2=0,3=0,6=0,7=0,8=0','1=3589443,2=1105920,3=0,6=25414,7=0,8=0','3=0,6=99','3=0,6=99','6=0','3=0,6=0','3=0,6=99','6=0','3=0,6=0','3=0,6=99');
/*!40000 ALTER TABLE `localcluster_step_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_suspend_table`
--

DROP TABLE IF EXISTS `localcluster_suspend_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_suspend_table` (
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `job_db_inx` bigint(20) unsigned NOT NULL,
  `id_assoc` int(11) NOT NULL,
  `time_start` bigint(20) unsigned NOT NULL DEFAULT 0,
  `time_end` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`job_db_inx`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`time_end`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_suspend_table`
--

LOCK TABLES `localcluster_suspend_table` WRITE;
/*!40000 ALTER TABLE `localcluster_suspend_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_suspend_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_usage_day_table`
--

DROP TABLE IF EXISTS `localcluster_usage_day_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_usage_day_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL,
  `time_start` bigint(20) unsigned NOT NULL,
  `count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `down_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `pdown_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `idle_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `plan_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `over_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_usage_day_table`
--

LOCK TABLES `localcluster_usage_day_table` WRITE;
/*!40000 ALTER TABLE `localcluster_usage_day_table` DISABLE KEYS */;
INSERT INTO `localcluster_usage_day_table` VALUES (1754121600,1754121600,0,1,1754031600,20,11,0,0,623589,0,0),(1754208000,1754208000,0,1,1754118000,20,64800,0,0,1663200,0,0),(1754318320,1754318320,0,1,1754204400,20,14434,0,0,1713566,0,0),(1754377200,1754377200,0,1,1754290800,20,7242,4840,0,1715812,106,0),(1754463600,1754463600,0,1,1754377200,20,0,0,0,1728000,0,0),(1754550000,1754550000,0,1,1754463600,20,45110,0,0,1656389,26501,0),(1754121600,1754121600,0,2,1754031600,94946,1044406,0,0,2959371874,0,0),(1754208000,1754208000,0,2,1754118000,94946,341805600,0,0,7861528800,0,0),(1754318320,1754318320,0,2,1754204400,94946,649530000,0,0,7474643670,0,0),(1754377200,1754377200,0,2,1754290800,90000,325890000,21780000,0,7428330000,0,0),(1754463600,1754463600,0,2,1754377200,90000,0,0,0,7776000000,0,0),(1754550000,1754550000,0,2,1754463600,90000,1284840000,0,0,6491160000,0,0),(1754121600,1754121600,0,3,1754031600,0,0,0,0,0,0,0),(1754208000,1754208000,0,3,1754118000,0,0,0,0,0,0,0),(1754318320,1754318320,0,3,1754204400,0,0,0,0,0,0,0),(1754377200,1754377200,0,3,1754290800,0,0,0,0,0,0,0),(1754463600,1754463600,0,3,1754377200,0,0,0,0,0,0,0),(1754550000,1754550000,0,3,1754463600,0,0,0,0,0,0,0),(1754121600,1754121600,0,5,1754031600,20,11,0,0,623589,0,0),(1754208000,1754208000,0,5,1754118000,20,64800,0,0,1663200,0,0),(1754318320,1754318320,0,5,1754204400,20,14434,0,0,1713566,0,0),(1754377200,1754377200,0,5,1754290800,20,7242,4840,0,1715918,0,0),(1754463600,1754463600,0,5,1754377200,20,0,0,0,1728000,0,0),(1754550000,1754550000,0,5,1754463600,416,2036462,0,0,2259907,0,0),(1754121600,1754121600,0,6,1754031600,0,0,0,0,0,0,0),(1754208000,1754208000,0,6,1754118000,0,0,0,0,0,0,0),(1754318320,1754318320,0,6,1754204400,0,0,0,0,0,0,0),(1754377200,1754377200,0,6,1754290800,0,0,0,0,0,0,0),(1754463600,1754463600,0,6,1754377200,0,0,0,0,0,0,0),(1754550000,1754550000,0,6,1754463600,0,0,0,0,0,0,0),(1754121600,1754121600,0,7,1754031600,0,0,0,0,0,0,0),(1754208000,1754208000,0,7,1754118000,0,0,0,0,0,0,0),(1754318320,1754318320,0,7,1754204400,0,0,0,0,0,0,0),(1754377200,1754377200,0,7,1754290800,0,0,0,0,0,0,0),(1754463600,1754463600,0,7,1754377200,0,0,0,0,0,0,0),(1754550000,1754550000,0,7,1754463600,0,0,0,0,0,0,0),(1754121600,1754121600,0,8,1754031600,0,0,0,0,0,0,0),(1754208000,1754208000,0,8,1754118000,0,0,0,0,0,0,0),(1754318320,1754318320,0,8,1754204400,0,0,0,0,0,0,0),(1754377200,1754377200,0,8,1754290800,0,0,0,0,0,0,0),(1754463600,1754463600,0,8,1754377200,0,0,0,0,0,0,0),(1754550000,1754550000,0,8,1754463600,0,0,0,0,0,0,0),(1754550000,1754550000,0,1001,1754463600,1,3426,0,0,2106,0,0),(1754550000,1754550000,0,1002,1754463600,1,3426,0,0,2106,0,0),(1754550000,1754550000,0,1003,1754463600,0,0,0,0,0,0,0),(1754550000,1754550000,0,1004,1754463600,0,0,0,0,0,0,0);
/*!40000 ALTER TABLE `localcluster_usage_day_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_usage_hour_table`
--

DROP TABLE IF EXISTS `localcluster_usage_hour_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_usage_hour_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL,
  `time_start` bigint(20) unsigned NOT NULL,
  `count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `down_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `pdown_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `idle_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `plan_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `over_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_usage_hour_table`
--

LOCK TABLES `localcluster_usage_hour_table` WRITE;
/*!40000 ALTER TABLE `localcluster_usage_hour_table` DISABLE KEYS */;
INSERT INTO `localcluster_usage_hour_table` VALUES (1754092800,1754092800,0,1,1754086820,20,11,0,0,47589,0,0),(1754092800,1754092800,0,1,1754089200,20,0,0,0,72000,0,0),(1754096400,1754096400,0,1,1754092800,20,0,0,0,72000,0,0),(1754100000,1754100000,0,1,1754096400,20,0,0,0,72000,0,0),(1754107200,1754107200,0,1,1754100000,20,0,0,0,72000,0,0),(1754107200,1754107200,0,1,1754103600,20,0,0,0,72000,0,0),(1754110800,1754110800,0,1,1754107200,20,0,0,0,72000,0,0),(1754114400,1754114400,0,1,1754110800,20,0,0,0,72000,0,0),(1754121599,1754121599,0,1,1754114400,20,0,0,0,72000,0,0),(1754125200,1754125200,0,1,1754118000,20,0,0,0,72000,0,0),(1754125200,1754125200,0,1,1754121600,20,0,0,0,72000,0,0),(1754128800,1754128800,0,1,1754125200,20,0,0,0,72000,0,0),(1754132400,1754132400,0,1,1754128800,20,0,0,0,72000,0,0),(1754139599,1754139599,0,1,1754132400,20,0,0,0,72000,0,0),(1754143200,1754143200,0,1,1754136000,20,0,0,0,72000,0,0),(1754143200,1754143200,0,1,1754139600,20,0,0,0,72000,0,0),(1754146800,1754146800,0,1,1754143200,20,0,0,0,72000,0,0),(1754150400,1754150400,0,1,1754146800,20,0,0,0,72000,0,0),(1754157600,1754157600,0,1,1754150400,20,0,0,0,72000,0,0),(1754157600,1754157600,0,1,1754154000,20,0,0,0,72000,0,0),(1754161200,1754161200,0,1,1754157600,20,0,0,0,72000,0,0),(1754164800,1754164800,0,1,1754161200,20,0,0,0,72000,0,0),(1754171999,1754171999,0,1,1754164800,20,0,0,0,72000,0,0),(1754175600,1754175600,0,1,1754168400,20,0,0,0,72000,0,0),(1754175600,1754175600,0,1,1754172000,20,0,0,0,72000,0,0),(1754179200,1754179200,0,1,1754175600,20,43092,0,0,28908,0,0),(1754182800,1754182800,0,1,1754179200,20,21708,0,0,50292,0,0),(1754190000,1754190000,0,1,1754182800,20,0,0,0,72000,0,0),(1754190000,1754190000,0,1,1754186400,20,0,0,0,72000,0,0),(1754193600,1754193600,0,1,1754190000,20,0,0,0,72000,0,0),(1754197200,1754197200,0,1,1754193600,20,0,0,0,72000,0,0),(1754200800,1754200800,0,1,1754197200,20,0,0,0,72000,0,0),(1754208000,1754208000,0,1,1754200800,20,0,0,0,72000,0,0),(1754208000,1754208000,0,1,1754204400,20,0,0,0,72000,0,0),(1754211600,1754211600,0,1,1754208000,20,0,0,0,72000,0,0),(1754215200,1754215200,0,1,1754211600,20,0,0,0,72000,0,0),(1754222399,1754222399,0,1,1754215200,20,0,0,0,72000,0,0),(1754226000,1754226000,0,1,1754218800,20,0,0,0,72000,0,0),(1754226000,1754226000,0,1,1754222400,20,0,0,0,72000,0,0),(1754229600,1754229600,0,1,1754226000,20,0,0,0,72000,0,0),(1754233200,1754233200,0,1,1754229600,20,0,0,0,72000,0,0),(1754240400,1754240400,0,1,1754233200,20,0,0,0,72000,0,0),(1754240400,1754240400,0,1,1754236800,20,0,0,0,72000,0,0),(1754244000,1754244000,0,1,1754240400,20,0,0,0,72000,0,0),(1754247600,1754247600,0,1,1754244000,20,0,0,0,72000,0,0),(1754254799,1754254799,0,1,1754247600,20,0,0,0,72000,0,0),(1754258400,1754258400,0,1,1754251200,20,0,0,0,72000,0,0),(1754258400,1754258400,0,1,1754254800,20,0,0,0,72000,0,0),(1754262000,1754262000,0,1,1754258400,20,0,0,0,72000,0,0),(1754265600,1754265600,0,1,1754262000,20,0,0,0,72000,0,0),(1754272800,1754272800,0,1,1754265600,20,0,0,0,72000,0,0),(1754272800,1754272800,0,1,1754269200,20,0,0,0,72000,0,0),(1754276400,1754276400,0,1,1754272800,20,2148,0,0,69852,0,0),(1754280000,1754280000,0,1,1754276400,20,5070,0,0,66930,0,0),(1754283600,1754283600,0,1,1754280000,20,5470,0,0,66530,0,0),(1754318319,1754318319,0,1,1754283600,20,1746,0,0,70254,0,0),(1754318319,1754318319,0,1,1754287200,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754290800,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754294400,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754298000,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754301600,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754305200,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754308800,20,0,0,0,72000,0,0),(1754318319,1754318319,0,1,1754312400,20,0,0,0,72000,0,0),(1754323199,1754323199,0,1,1754316000,20,1912,4840,0,65142,106,0),(1754326799,1754326799,0,1,1754319600,20,5330,0,0,66670,0,0),(1754330400,1754330400,0,1,1754323200,20,0,0,0,72000,0,0),(1754330400,1754330400,0,1,1754326800,20,0,0,0,72000,0,0),(1754334000,1754334000,0,1,1754330400,20,0,0,0,72000,0,0),(1754341199,1754341199,0,1,1754334000,20,0,0,0,72000,0,0),(1754344800,1754344800,0,1,1754337600,20,0,0,0,72000,0,0),(1754344800,1754344800,0,1,1754341200,20,0,0,0,72000,0,0),(1754348400,1754348400,0,1,1754344800,20,0,0,0,72000,0,0),(1754355599,1754355599,0,1,1754348400,20,0,0,0,72000,0,0),(1754359199,1754359199,0,1,1754352000,20,0,0,0,72000,0,0),(1754362800,1754362800,0,1,1754355600,20,0,0,0,72000,0,0),(1754362800,1754362800,0,1,1754359200,20,0,0,0,72000,0,0),(1754366400,1754366400,0,1,1754362800,20,0,0,0,72000,0,0),(1754370000,1754370000,0,1,1754366400,20,0,0,0,72000,0,0),(1754377200,1754377200,0,1,1754370000,20,0,0,0,72000,0,0),(1754377200,1754377200,0,1,1754373600,20,0,0,0,72000,0,0),(1754380800,1754380800,0,1,1754377200,20,0,0,0,72000,0,0),(1754387999,1754387999,0,1,1754380800,20,0,0,0,72000,0,0),(1754391599,1754391599,0,1,1754384400,20,0,0,0,72000,0,0),(1754395200,1754395200,0,1,1754388000,20,0,0,0,72000,0,0),(1754395200,1754395200,0,1,1754391600,20,0,0,0,72000,0,0),(1754398800,1754398800,0,1,1754395200,20,0,0,0,72000,0,0),(1754405999,1754405999,0,1,1754398800,20,0,0,0,72000,0,0),(1754409599,1754409599,0,1,1754402400,20,0,0,0,72000,0,0),(1754413200,1754413200,0,1,1754406000,20,0,0,0,72000,0,0),(1754413200,1754413200,0,1,1754409600,20,0,0,0,72000,0,0),(1754416800,1754416800,0,1,1754413200,20,0,0,0,72000,0,0),(1754423999,1754423999,0,1,1754416800,20,0,0,0,72000,0,0),(1754427600,1754427600,0,1,1754420400,20,0,0,0,72000,0,0),(1754427600,1754427600,0,1,1754424000,20,0,0,0,72000,0,0),(1754431200,1754431200,0,1,1754427600,20,0,0,0,72000,0,0),(1754438400,1754438400,0,1,1754431200,20,0,0,0,72000,0,0),(1754442000,1754442000,0,1,1754434800,20,0,0,0,72000,0,0),(1754445600,1754445600,0,1,1754438400,20,0,0,0,72000,0,0),(1754445600,1754445600,0,1,1754442000,20,0,0,0,72000,0,0),(1754449200,1754449200,0,1,1754445600,20,0,0,0,72000,0,0),(1754456399,1754456399,0,1,1754449200,20,0,0,0,72000,0,0),(1754460000,1754460000,0,1,1754452800,20,0,0,0,72000,0,0),(1754460000,1754460000,0,1,1754456400,20,0,0,0,72000,0,0),(1754463600,1754463600,0,1,1754460000,20,0,0,0,72000,0,0),(1754467200,1754467200,0,1,1754463600,20,0,0,0,72000,0,0),(1754470800,1754470800,0,1,1754467200,20,0,0,0,72000,0,0),(1754478000,1754478000,0,1,1754470800,20,0,0,0,72000,0,0),(1754478000,1754478000,0,1,1754474400,20,0,0,0,72000,0,0),(1754481600,1754481600,0,1,1754478000,20,0,0,0,72000,0,0),(1754488799,1754488799,0,1,1754481600,20,0,0,0,72000,0,0),(1754492399,1754492399,0,1,1754485200,20,0,0,0,72000,0,0),(1754496000,1754496000,0,1,1754488800,20,794,0,0,71206,0,0),(1754496000,1754496000,0,1,1754492400,20,2831,0,0,69169,0,0),(1754499600,1754499600,0,1,1754496000,20,0,0,0,72000,0,0),(1754506799,1754506799,0,1,1754499600,20,0,0,0,72000,0,0),(1754510400,1754510400,0,1,1754503200,20,0,0,0,72000,0,0),(1754510400,1754510400,0,1,1754506800,20,0,0,0,72000,0,0),(1754514000,1754514000,0,1,1754510400,20,0,0,0,72000,0,0),(1754521199,1754521199,0,1,1754514000,20,0,0,0,72000,0,0),(1754524799,1754524799,0,1,1754517600,20,0,0,0,72000,0,0),(1754528400,1754528400,0,1,1754521200,20,0,0,0,72000,0,0),(1754528400,1754528400,0,1,1754524800,20,0,0,0,72000,0,0),(1754532000,1754532000,0,1,1754528400,20,0,0,0,72000,0,0),(1754539199,1754539199,0,1,1754532000,20,0,0,0,72000,0,0),(1754542799,1754542799,0,1,1754535600,20,0,0,0,72000,0,0),(1754546400,1754546400,0,1,1754539200,20,3451,0,0,66672,1877,0),(1754546400,1754546400,0,1,1754542800,20,3600,0,0,52716,15684,0),(1754550000,1754550000,0,1,1754546400,20,34434,0,0,28626,8940,0),(1754553600,1754553600,0,1,1754550000,20,8824,0,0,62770,406,0),(1754557200,1754557200,0,1,1754553600,20,406,0,0,71594,0,0),(1754560800,1754560800,0,1,1754557200,20,0,0,0,72000,0,0),(1754564400,1754564400,0,1,1754560800,20,0,0,0,72000,0,0),(1754568000,1754568000,0,1,1754564400,20,0,0,0,72000,0,0),(1754575200,1754575200,0,1,1754568000,20,0,0,0,72000,0,0),(1754092800,1754092800,0,2,1754086820,94946,1044406,0,0,224927074,0,0),(1754092800,1754092800,0,2,1754089200,94946,0,0,0,341805600,0,0),(1754096400,1754096400,0,2,1754092800,94946,0,0,0,341805600,0,0),(1754100000,1754100000,0,2,1754096400,94946,0,0,0,341805600,0,0),(1754107200,1754107200,0,2,1754100000,94946,0,0,0,341805600,0,0),(1754107200,1754107200,0,2,1754103600,94946,0,0,0,341805600,0,0),(1754110800,1754110800,0,2,1754107200,94946,0,0,0,341805600,0,0),(1754114400,1754114400,0,2,1754110800,94946,0,0,0,341805600,0,0),(1754121599,1754121599,0,2,1754114400,94946,0,0,0,341805600,0,0),(1754125200,1754125200,0,2,1754118000,94946,0,0,0,341805600,0,0),(1754125200,1754125200,0,2,1754121600,94946,0,0,0,341805600,0,0),(1754128800,1754128800,0,2,1754125200,94946,0,0,0,341805600,0,0),(1754132400,1754132400,0,2,1754128800,94946,0,0,0,341805600,0,0),(1754139599,1754139599,0,2,1754132400,94946,0,0,0,341805600,0,0),(1754143200,1754143200,0,2,1754136000,94946,0,0,0,341805600,0,0),(1754143200,1754143200,0,2,1754139600,94946,0,0,0,341805600,0,0),(1754146800,1754146800,0,2,1754143200,94946,0,0,0,341805600,0,0),(1754150400,1754150400,0,2,1754146800,94946,0,0,0,341805600,0,0),(1754157600,1754157600,0,2,1754150400,94946,0,0,0,341805600,0,0),(1754157600,1754157600,0,2,1754154000,94946,0,0,0,341805600,0,0),(1754161200,1754161200,0,2,1754157600,94946,0,0,0,341805600,0,0),(1754164800,1754164800,0,2,1754161200,94946,0,0,0,341805600,0,0),(1754171999,1754171999,0,2,1754164800,94946,0,0,0,341805600,0,0),(1754175600,1754175600,0,2,1754168400,94946,0,0,0,341805600,0,0),(1754175600,1754175600,0,2,1754172000,94946,0,0,0,341805600,0,0),(1754179200,1754179200,0,2,1754175600,94946,227300724,0,0,114504876,0,0),(1754182800,1754182800,0,2,1754179200,94946,114504876,0,0,227300724,0,0),(1754190000,1754190000,0,2,1754182800,94946,0,0,0,341805600,0,0),(1754190000,1754190000,0,2,1754186400,94946,0,0,0,341805600,0,0),(1754193600,1754193600,0,2,1754190000,94946,0,0,0,341805600,0,0),(1754197200,1754197200,0,2,1754193600,94946,0,0,0,341805600,0,0),(1754200800,1754200800,0,2,1754197200,94946,0,0,0,341805600,0,0),(1754208000,1754208000,0,2,1754200800,94946,0,0,0,341805600,0,0),(1754208000,1754208000,0,2,1754204400,94946,0,0,0,341805600,0,0),(1754211600,1754211600,0,2,1754208000,94946,0,0,0,341805600,0,0),(1754215200,1754215200,0,2,1754211600,94946,0,0,0,341805600,0,0),(1754222399,1754222399,0,2,1754215200,94946,0,0,0,341805600,0,0),(1754226000,1754226000,0,2,1754218800,94946,0,0,0,341805600,0,0),(1754226000,1754226000,0,2,1754222400,94946,0,0,0,341805600,0,0),(1754229600,1754229600,0,2,1754226000,94946,0,0,0,341805600,0,0),(1754233200,1754233200,0,2,1754229600,94946,0,0,0,341805600,0,0),(1754240400,1754240400,0,2,1754233200,94946,0,0,0,341805600,0,0),(1754240400,1754240400,0,2,1754236800,94946,0,0,0,341805600,0,0),(1754244000,1754244000,0,2,1754240400,94946,0,0,0,341805600,0,0),(1754247600,1754247600,0,2,1754244000,94946,0,0,0,341805600,0,0),(1754254799,1754254799,0,2,1754247600,94946,0,0,0,341805600,0,0),(1754258400,1754258400,0,2,1754251200,94946,0,0,0,341805600,0,0),(1754258400,1754258400,0,2,1754254800,94946,0,0,0,341805600,0,0),(1754262000,1754262000,0,2,1754258400,94946,0,0,0,341805600,0,0),(1754265600,1754265600,0,2,1754262000,94946,0,0,0,341805600,0,0),(1754272800,1754272800,0,2,1754265600,94946,0,0,0,341805600,0,0),(1754272800,1754272800,0,2,1754269200,94946,0,0,0,341805600,0,0),(1754276400,1754276400,0,2,1754272800,90000,96660000,0,0,237207270,0,0),(1754280000,1754280000,0,2,1754276400,90000,228150000,0,0,95850000,0,0),(1754283600,1754283600,0,2,1754280000,90000,246150000,0,0,77850000,0,0),(1754318319,1754318319,0,2,1754283600,90000,78570000,0,0,245430000,0,0),(1754318319,1754318319,0,2,1754287200,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754290800,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754294400,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754298000,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754301600,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754305200,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754308800,90000,0,0,0,324000000,0,0),(1754318319,1754318319,0,2,1754312400,90000,0,0,0,324000000,0,0),(1754323199,1754323199,0,2,1754316000,90000,86040000,21780000,0,216180000,0,0),(1754326799,1754326799,0,2,1754319600,90000,239850000,0,0,84150000,0,0),(1754330400,1754330400,0,2,1754323200,90000,0,0,0,324000000,0,0),(1754330400,1754330400,0,2,1754326800,90000,0,0,0,324000000,0,0),(1754334000,1754334000,0,2,1754330400,90000,0,0,0,324000000,0,0),(1754341199,1754341199,0,2,1754334000,90000,0,0,0,324000000,0,0),(1754344800,1754344800,0,2,1754337600,90000,0,0,0,324000000,0,0),(1754344800,1754344800,0,2,1754341200,90000,0,0,0,324000000,0,0),(1754348400,1754348400,0,2,1754344800,90000,0,0,0,324000000,0,0),(1754355599,1754355599,0,2,1754348400,90000,0,0,0,324000000,0,0),(1754359199,1754359199,0,2,1754352000,90000,0,0,0,324000000,0,0),(1754362800,1754362800,0,2,1754355600,90000,0,0,0,324000000,0,0),(1754362800,1754362800,0,2,1754359200,90000,0,0,0,324000000,0,0),(1754366400,1754366400,0,2,1754362800,90000,0,0,0,324000000,0,0),(1754370000,1754370000,0,2,1754366400,90000,0,0,0,324000000,0,0),(1754377200,1754377200,0,2,1754370000,90000,0,0,0,324000000,0,0),(1754377200,1754377200,0,2,1754373600,90000,0,0,0,324000000,0,0),(1754380800,1754380800,0,2,1754377200,90000,0,0,0,324000000,0,0),(1754387999,1754387999,0,2,1754380800,90000,0,0,0,324000000,0,0),(1754391599,1754391599,0,2,1754384400,90000,0,0,0,324000000,0,0),(1754395200,1754395200,0,2,1754388000,90000,0,0,0,324000000,0,0),(1754395200,1754395200,0,2,1754391600,90000,0,0,0,324000000,0,0),(1754398800,1754398800,0,2,1754395200,90000,0,0,0,324000000,0,0),(1754405999,1754405999,0,2,1754398800,90000,0,0,0,324000000,0,0),(1754409599,1754409599,0,2,1754402400,90000,0,0,0,324000000,0,0),(1754413200,1754413200,0,2,1754406000,90000,0,0,0,324000000,0,0),(1754413200,1754413200,0,2,1754409600,90000,0,0,0,324000000,0,0),(1754416800,1754416800,0,2,1754413200,90000,0,0,0,324000000,0,0),(1754423999,1754423999,0,2,1754416800,90000,0,0,0,324000000,0,0),(1754427600,1754427600,0,2,1754420400,90000,0,0,0,324000000,0,0),(1754427600,1754427600,0,2,1754424000,90000,0,0,0,324000000,0,0),(1754431200,1754431200,0,2,1754427600,90000,0,0,0,324000000,0,0),(1754438400,1754438400,0,2,1754431200,90000,0,0,0,324000000,0,0),(1754442000,1754442000,0,2,1754434800,90000,0,0,0,324000000,0,0),(1754445600,1754445600,0,2,1754438400,90000,0,0,0,324000000,0,0),(1754445600,1754445600,0,2,1754442000,90000,0,0,0,324000000,0,0),(1754449200,1754449200,0,2,1754445600,90000,0,0,0,324000000,0,0),(1754456399,1754456399,0,2,1754449200,90000,0,0,0,324000000,0,0),(1754460000,1754460000,0,2,1754452800,90000,0,0,0,324000000,0,0),(1754460000,1754460000,0,2,1754456400,90000,0,0,0,324000000,0,0),(1754463600,1754463600,0,2,1754460000,90000,0,0,0,324000000,0,0),(1754467200,1754467200,0,2,1754463600,90000,0,0,0,324000000,0,0),(1754470800,1754470800,0,2,1754467200,90000,0,0,0,324000000,0,0),(1754478000,1754478000,0,2,1754470800,90000,0,0,0,324000000,0,0),(1754478000,1754478000,0,2,1754474400,90000,0,0,0,324000000,0,0),(1754481600,1754481600,0,2,1754478000,90000,0,0,0,324000000,0,0),(1754488799,1754488799,0,2,1754481600,90000,0,0,0,324000000,0,0),(1754492399,1754492399,0,2,1754485200,90000,0,0,0,324000000,0,0),(1754496000,1754496000,0,2,1754488800,90000,71460000,0,0,252540000,0,0),(1754496000,1754496000,0,2,1754492400,90000,254790000,0,0,69210000,0,0),(1754499600,1754499600,0,2,1754496000,90000,0,0,0,324000000,0,0),(1754506799,1754506799,0,2,1754499600,90000,0,0,0,324000000,0,0),(1754510400,1754510400,0,2,1754503200,90000,0,0,0,324000000,0,0),(1754510400,1754510400,0,2,1754506800,90000,0,0,0,324000000,0,0),(1754514000,1754514000,0,2,1754510400,90000,0,0,0,324000000,0,0),(1754521199,1754521199,0,2,1754514000,90000,0,0,0,324000000,0,0),(1754524799,1754524799,0,2,1754517600,90000,0,0,0,324000000,0,0),(1754528400,1754528400,0,2,1754521200,90000,0,0,0,324000000,0,0),(1754528400,1754528400,0,2,1754524800,90000,0,0,0,324000000,0,0),(1754532000,1754532000,0,2,1754528400,90000,0,0,0,324000000,0,0),(1754539199,1754539199,0,2,1754532000,90000,0,0,0,324000000,0,0),(1754542799,1754542799,0,2,1754535600,90000,0,0,0,324000000,0,0),(1754546400,1754546400,0,2,1754539200,90000,310590000,0,0,13410000,0,0),(1754546400,1754546400,0,2,1754542800,90000,324000000,0,0,0,0,0),(1754550000,1754550000,0,2,1754546400,90000,324000000,0,0,0,0,0),(1754553600,1754553600,0,2,1754550000,90000,48843000,0,0,275157000,0,0),(1754557200,1754557200,0,2,1754553600,90000,1827000,0,0,322173000,0,0),(1754560800,1754560800,0,2,1754557200,90000,0,0,0,324000000,0,0),(1754564400,1754564400,0,2,1754560800,90000,0,0,0,324000000,0,0),(1754568000,1754568000,0,2,1754564400,90000,0,0,0,324000000,0,0),(1754575200,1754575200,0,2,1754568000,90000,0,0,0,324000000,0,0),(1754092800,1754092800,0,3,1754086820,0,0,0,0,0,0,0),(1754092800,1754092800,0,3,1754089200,0,0,0,0,0,0,0),(1754096400,1754096400,0,3,1754092800,0,0,0,0,0,0,0),(1754100000,1754100000,0,3,1754096400,0,0,0,0,0,0,0),(1754107200,1754107200,0,3,1754100000,0,0,0,0,0,0,0),(1754107200,1754107200,0,3,1754103600,0,0,0,0,0,0,0),(1754110800,1754110800,0,3,1754107200,0,0,0,0,0,0,0),(1754114400,1754114400,0,3,1754110800,0,0,0,0,0,0,0),(1754121599,1754121599,0,3,1754114400,0,0,0,0,0,0,0),(1754125200,1754125200,0,3,1754118000,0,0,0,0,0,0,0),(1754125200,1754125200,0,3,1754121600,0,0,0,0,0,0,0),(1754128800,1754128800,0,3,1754125200,0,0,0,0,0,0,0),(1754132400,1754132400,0,3,1754128800,0,0,0,0,0,0,0),(1754139599,1754139599,0,3,1754132400,0,0,0,0,0,0,0),(1754143200,1754143200,0,3,1754136000,0,0,0,0,0,0,0),(1754143200,1754143200,0,3,1754139600,0,0,0,0,0,0,0),(1754146800,1754146800,0,3,1754143200,0,0,0,0,0,0,0),(1754150400,1754150400,0,3,1754146800,0,0,0,0,0,0,0),(1754157600,1754157600,0,3,1754150400,0,0,0,0,0,0,0),(1754157600,1754157600,0,3,1754154000,0,0,0,0,0,0,0),(1754161200,1754161200,0,3,1754157600,0,0,0,0,0,0,0),(1754164800,1754164800,0,3,1754161200,0,0,0,0,0,0,0),(1754171999,1754171999,0,3,1754164800,0,0,0,0,0,0,0),(1754175600,1754175600,0,3,1754168400,0,0,0,0,0,0,0),(1754175600,1754175600,0,3,1754172000,0,0,0,0,0,0,0),(1754179200,1754179200,0,3,1754175600,0,0,0,0,0,0,0),(1754182800,1754182800,0,3,1754179200,0,0,0,0,0,0,0),(1754190000,1754190000,0,3,1754182800,0,0,0,0,0,0,0),(1754190000,1754190000,0,3,1754186400,0,0,0,0,0,0,0),(1754193600,1754193600,0,3,1754190000,0,0,0,0,0,0,0),(1754197200,1754197200,0,3,1754193600,0,0,0,0,0,0,0),(1754200800,1754200800,0,3,1754197200,0,0,0,0,0,0,0),(1754208000,1754208000,0,3,1754200800,0,0,0,0,0,0,0),(1754208000,1754208000,0,3,1754204400,0,0,0,0,0,0,0),(1754211600,1754211600,0,3,1754208000,0,0,0,0,0,0,0),(1754215200,1754215200,0,3,1754211600,0,0,0,0,0,0,0),(1754222399,1754222399,0,3,1754215200,0,0,0,0,0,0,0),(1754226000,1754226000,0,3,1754218800,0,0,0,0,0,0,0),(1754226000,1754226000,0,3,1754222400,0,0,0,0,0,0,0),(1754229600,1754229600,0,3,1754226000,0,0,0,0,0,0,0),(1754233200,1754233200,0,3,1754229600,0,0,0,0,0,0,0),(1754240400,1754240400,0,3,1754233200,0,0,0,0,0,0,0),(1754240400,1754240400,0,3,1754236800,0,0,0,0,0,0,0),(1754244000,1754244000,0,3,1754240400,0,0,0,0,0,0,0),(1754247600,1754247600,0,3,1754244000,0,0,0,0,0,0,0),(1754254799,1754254799,0,3,1754247600,0,0,0,0,0,0,0),(1754258400,1754258400,0,3,1754251200,0,0,0,0,0,0,0),(1754258400,1754258400,0,3,1754254800,0,0,0,0,0,0,0),(1754262000,1754262000,0,3,1754258400,0,0,0,0,0,0,0),(1754265600,1754265600,0,3,1754262000,0,0,0,0,0,0,0),(1754272800,1754272800,0,3,1754265600,0,0,0,0,0,0,0),(1754272800,1754272800,0,3,1754269200,0,0,0,0,0,0,0),(1754276400,1754276400,0,3,1754272800,0,0,0,0,0,0,0),(1754280000,1754280000,0,3,1754276400,0,0,0,0,0,0,0),(1754283600,1754283600,0,3,1754280000,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754283600,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754287200,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754290800,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754294400,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754298000,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754301600,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754305200,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754308800,0,0,0,0,0,0,0),(1754318319,1754318319,0,3,1754312400,0,0,0,0,0,0,0),(1754323199,1754323199,0,3,1754316000,0,0,0,0,0,0,0),(1754326799,1754326799,0,3,1754319600,0,0,0,0,0,0,0),(1754330400,1754330400,0,3,1754323200,0,0,0,0,0,0,0),(1754330400,1754330400,0,3,1754326800,0,0,0,0,0,0,0),(1754334000,1754334000,0,3,1754330400,0,0,0,0,0,0,0),(1754341199,1754341199,0,3,1754334000,0,0,0,0,0,0,0),(1754344800,1754344800,0,3,1754337600,0,0,0,0,0,0,0),(1754344800,1754344800,0,3,1754341200,0,0,0,0,0,0,0),(1754348400,1754348400,0,3,1754344800,0,0,0,0,0,0,0),(1754355599,1754355599,0,3,1754348400,0,0,0,0,0,0,0),(1754359199,1754359199,0,3,1754352000,0,0,0,0,0,0,0),(1754362800,1754362800,0,3,1754355600,0,0,0,0,0,0,0),(1754362800,1754362800,0,3,1754359200,0,0,0,0,0,0,0),(1754366400,1754366400,0,3,1754362800,0,0,0,0,0,0,0),(1754370000,1754370000,0,3,1754366400,0,0,0,0,0,0,0),(1754377200,1754377200,0,3,1754370000,0,0,0,0,0,0,0),(1754377200,1754377200,0,3,1754373600,0,0,0,0,0,0,0),(1754380800,1754380800,0,3,1754377200,0,0,0,0,0,0,0),(1754387999,1754387999,0,3,1754380800,0,0,0,0,0,0,0),(1754391599,1754391599,0,3,1754384400,0,0,0,0,0,0,0),(1754395200,1754395200,0,3,1754388000,0,0,0,0,0,0,0),(1754395200,1754395200,0,3,1754391600,0,0,0,0,0,0,0),(1754398800,1754398800,0,3,1754395200,0,0,0,0,0,0,0),(1754405999,1754405999,0,3,1754398800,0,0,0,0,0,0,0),(1754409599,1754409599,0,3,1754402400,0,0,0,0,0,0,0),(1754413200,1754413200,0,3,1754406000,0,0,0,0,0,0,0),(1754413200,1754413200,0,3,1754409600,0,0,0,0,0,0,0),(1754416800,1754416800,0,3,1754413200,0,0,0,0,0,0,0),(1754423999,1754423999,0,3,1754416800,0,0,0,0,0,0,0),(1754427600,1754427600,0,3,1754420400,0,0,0,0,0,0,0),(1754427600,1754427600,0,3,1754424000,0,0,0,0,0,0,0),(1754431200,1754431200,0,3,1754427600,0,0,0,0,0,0,0),(1754438400,1754438400,0,3,1754431200,0,0,0,0,0,0,0),(1754442000,1754442000,0,3,1754434800,0,0,0,0,0,0,0),(1754445600,1754445600,0,3,1754438400,0,0,0,0,0,0,0),(1754445600,1754445600,0,3,1754442000,0,0,0,0,0,0,0),(1754449200,1754449200,0,3,1754445600,0,0,0,0,0,0,0),(1754456399,1754456399,0,3,1754449200,0,0,0,0,0,0,0),(1754460000,1754460000,0,3,1754452800,0,0,0,0,0,0,0),(1754460000,1754460000,0,3,1754456400,0,0,0,0,0,0,0),(1754463600,1754463600,0,3,1754460000,0,0,0,0,0,0,0),(1754467200,1754467200,0,3,1754463600,0,0,0,0,0,0,0),(1754470800,1754470800,0,3,1754467200,0,0,0,0,0,0,0),(1754478000,1754478000,0,3,1754470800,0,0,0,0,0,0,0),(1754478000,1754478000,0,3,1754474400,0,0,0,0,0,0,0),(1754481600,1754481600,0,3,1754478000,0,0,0,0,0,0,0),(1754488799,1754488799,0,3,1754481600,0,0,0,0,0,0,0),(1754492399,1754492399,0,3,1754485200,0,0,0,0,0,0,0),(1754496000,1754496000,0,3,1754488800,0,0,0,0,0,0,0),(1754496000,1754496000,0,3,1754492400,0,0,0,0,0,0,0),(1754499600,1754499600,0,3,1754496000,0,0,0,0,0,0,0),(1754506799,1754506799,0,3,1754499600,0,0,0,0,0,0,0),(1754510400,1754510400,0,3,1754503200,0,0,0,0,0,0,0),(1754510400,1754510400,0,3,1754506800,0,0,0,0,0,0,0),(1754514000,1754514000,0,3,1754510400,0,0,0,0,0,0,0),(1754521199,1754521199,0,3,1754514000,0,0,0,0,0,0,0),(1754524799,1754524799,0,3,1754517600,0,0,0,0,0,0,0),(1754528400,1754528400,0,3,1754521200,0,0,0,0,0,0,0),(1754528400,1754528400,0,3,1754524800,0,0,0,0,0,0,0),(1754532000,1754532000,0,3,1754528400,0,0,0,0,0,0,0),(1754539199,1754539199,0,3,1754532000,0,0,0,0,0,0,0),(1754542799,1754542799,0,3,1754535600,0,0,0,0,0,0,0),(1754546400,1754546400,0,3,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,3,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,3,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,3,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,3,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,3,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,3,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,3,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,3,1754568000,0,0,0,0,0,0,0),(1754092800,1754092800,0,5,1754086820,20,11,0,0,47589,0,0),(1754092800,1754092800,0,5,1754089200,20,0,0,0,72000,0,0),(1754096400,1754096400,0,5,1754092800,20,0,0,0,72000,0,0),(1754100000,1754100000,0,5,1754096400,20,0,0,0,72000,0,0),(1754107200,1754107200,0,5,1754100000,20,0,0,0,72000,0,0),(1754107200,1754107200,0,5,1754103600,20,0,0,0,72000,0,0),(1754110800,1754110800,0,5,1754107200,20,0,0,0,72000,0,0),(1754114400,1754114400,0,5,1754110800,20,0,0,0,72000,0,0),(1754121599,1754121599,0,5,1754114400,20,0,0,0,72000,0,0),(1754125200,1754125200,0,5,1754118000,20,0,0,0,72000,0,0),(1754125200,1754125200,0,5,1754121600,20,0,0,0,72000,0,0),(1754128800,1754128800,0,5,1754125200,20,0,0,0,72000,0,0),(1754132400,1754132400,0,5,1754128800,20,0,0,0,72000,0,0),(1754139599,1754139599,0,5,1754132400,20,0,0,0,72000,0,0),(1754143200,1754143200,0,5,1754136000,20,0,0,0,72000,0,0),(1754143200,1754143200,0,5,1754139600,20,0,0,0,72000,0,0),(1754146800,1754146800,0,5,1754143200,20,0,0,0,72000,0,0),(1754150400,1754150400,0,5,1754146800,20,0,0,0,72000,0,0),(1754157600,1754157600,0,5,1754150400,20,0,0,0,72000,0,0),(1754157600,1754157600,0,5,1754154000,20,0,0,0,72000,0,0),(1754161200,1754161200,0,5,1754157600,20,0,0,0,72000,0,0),(1754164800,1754164800,0,5,1754161200,20,0,0,0,72000,0,0),(1754171999,1754171999,0,5,1754164800,20,0,0,0,72000,0,0),(1754175600,1754175600,0,5,1754168400,20,0,0,0,72000,0,0),(1754175600,1754175600,0,5,1754172000,20,0,0,0,72000,0,0),(1754179200,1754179200,0,5,1754175600,20,43092,0,0,28908,0,0),(1754182800,1754182800,0,5,1754179200,20,21708,0,0,50292,0,0),(1754190000,1754190000,0,5,1754182800,20,0,0,0,72000,0,0),(1754190000,1754190000,0,5,1754186400,20,0,0,0,72000,0,0),(1754193600,1754193600,0,5,1754190000,20,0,0,0,72000,0,0),(1754197200,1754197200,0,5,1754193600,20,0,0,0,72000,0,0),(1754200800,1754200800,0,5,1754197200,20,0,0,0,72000,0,0),(1754208000,1754208000,0,5,1754200800,20,0,0,0,72000,0,0),(1754208000,1754208000,0,5,1754204400,20,0,0,0,72000,0,0),(1754211600,1754211600,0,5,1754208000,20,0,0,0,72000,0,0),(1754215200,1754215200,0,5,1754211600,20,0,0,0,72000,0,0),(1754222399,1754222399,0,5,1754215200,20,0,0,0,72000,0,0),(1754226000,1754226000,0,5,1754218800,20,0,0,0,72000,0,0),(1754226000,1754226000,0,5,1754222400,20,0,0,0,72000,0,0),(1754229600,1754229600,0,5,1754226000,20,0,0,0,72000,0,0),(1754233200,1754233200,0,5,1754229600,20,0,0,0,72000,0,0),(1754240400,1754240400,0,5,1754233200,20,0,0,0,72000,0,0),(1754240400,1754240400,0,5,1754236800,20,0,0,0,72000,0,0),(1754244000,1754244000,0,5,1754240400,20,0,0,0,72000,0,0),(1754247600,1754247600,0,5,1754244000,20,0,0,0,72000,0,0),(1754254799,1754254799,0,5,1754247600,20,0,0,0,72000,0,0),(1754258400,1754258400,0,5,1754251200,20,0,0,0,72000,0,0),(1754258400,1754258400,0,5,1754254800,20,0,0,0,72000,0,0),(1754262000,1754262000,0,5,1754258400,20,0,0,0,72000,0,0),(1754265600,1754265600,0,5,1754262000,20,0,0,0,72000,0,0),(1754272800,1754272800,0,5,1754265600,20,0,0,0,72000,0,0),(1754272800,1754272800,0,5,1754269200,20,0,0,0,72000,0,0),(1754276400,1754276400,0,5,1754272800,20,2148,0,0,69852,0,0),(1754280000,1754280000,0,5,1754276400,20,5070,0,0,66930,0,0),(1754283600,1754283600,0,5,1754280000,20,5470,0,0,66530,0,0),(1754318319,1754318319,0,5,1754283600,20,1746,0,0,70254,0,0),(1754318319,1754318319,0,5,1754287200,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754290800,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754294400,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754298000,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754301600,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754305200,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754308800,20,0,0,0,72000,0,0),(1754318319,1754318319,0,5,1754312400,20,0,0,0,72000,0,0),(1754323199,1754323199,0,5,1754316000,20,1912,4840,0,65248,0,0),(1754326799,1754326799,0,5,1754319600,20,5330,0,0,66670,0,0),(1754330400,1754330400,0,5,1754323200,20,0,0,0,72000,0,0),(1754330400,1754330400,0,5,1754326800,20,0,0,0,72000,0,0),(1754334000,1754334000,0,5,1754330400,20,0,0,0,72000,0,0),(1754341199,1754341199,0,5,1754334000,20,0,0,0,72000,0,0),(1754344800,1754344800,0,5,1754337600,20,0,0,0,72000,0,0),(1754344800,1754344800,0,5,1754341200,20,0,0,0,72000,0,0),(1754348400,1754348400,0,5,1754344800,20,0,0,0,72000,0,0),(1754355599,1754355599,0,5,1754348400,20,0,0,0,72000,0,0),(1754359199,1754359199,0,5,1754352000,20,0,0,0,72000,0,0),(1754362800,1754362800,0,5,1754355600,20,0,0,0,72000,0,0),(1754362800,1754362800,0,5,1754359200,20,0,0,0,72000,0,0),(1754366400,1754366400,0,5,1754362800,20,0,0,0,72000,0,0),(1754370000,1754370000,0,5,1754366400,20,0,0,0,72000,0,0),(1754377200,1754377200,0,5,1754370000,20,0,0,0,72000,0,0),(1754377200,1754377200,0,5,1754373600,20,0,0,0,72000,0,0),(1754380800,1754380800,0,5,1754377200,20,0,0,0,72000,0,0),(1754387999,1754387999,0,5,1754380800,20,0,0,0,72000,0,0),(1754391599,1754391599,0,5,1754384400,20,0,0,0,72000,0,0),(1754395200,1754395200,0,5,1754388000,20,0,0,0,72000,0,0),(1754395200,1754395200,0,5,1754391600,20,0,0,0,72000,0,0),(1754398800,1754398800,0,5,1754395200,20,0,0,0,72000,0,0),(1754405999,1754405999,0,5,1754398800,20,0,0,0,72000,0,0),(1754409599,1754409599,0,5,1754402400,20,0,0,0,72000,0,0),(1754413200,1754413200,0,5,1754406000,20,0,0,0,72000,0,0),(1754413200,1754413200,0,5,1754409600,20,0,0,0,72000,0,0),(1754416800,1754416800,0,5,1754413200,20,0,0,0,72000,0,0),(1754423999,1754423999,0,5,1754416800,20,0,0,0,72000,0,0),(1754427600,1754427600,0,5,1754420400,20,0,0,0,72000,0,0),(1754427600,1754427600,0,5,1754424000,20,0,0,0,72000,0,0),(1754431200,1754431200,0,5,1754427600,20,0,0,0,72000,0,0),(1754438400,1754438400,0,5,1754431200,20,0,0,0,72000,0,0),(1754442000,1754442000,0,5,1754434800,20,0,0,0,72000,0,0),(1754445600,1754445600,0,5,1754438400,20,0,0,0,72000,0,0),(1754445600,1754445600,0,5,1754442000,20,0,0,0,72000,0,0),(1754449200,1754449200,0,5,1754445600,20,0,0,0,72000,0,0),(1754456399,1754456399,0,5,1754449200,20,0,0,0,72000,0,0),(1754460000,1754460000,0,5,1754452800,20,0,0,0,72000,0,0),(1754460000,1754460000,0,5,1754456400,20,0,0,0,72000,0,0),(1754463600,1754463600,0,5,1754460000,20,0,0,0,72000,0,0),(1754467200,1754467200,0,5,1754463600,20,0,0,0,72000,0,0),(1754470800,1754470800,0,5,1754467200,20,0,0,0,72000,0,0),(1754478000,1754478000,0,5,1754470800,20,0,0,0,72000,0,0),(1754478000,1754478000,0,5,1754474400,20,0,0,0,72000,0,0),(1754481600,1754481600,0,5,1754478000,20,0,0,0,72000,0,0),(1754488799,1754488799,0,5,1754481600,20,0,0,0,72000,0,0),(1754492399,1754492399,0,5,1754485200,20,0,0,0,72000,0,0),(1754496000,1754496000,0,5,1754488800,20,794,0,0,71206,0,0),(1754496000,1754496000,0,5,1754492400,20,2831,0,0,69169,0,0),(1754499600,1754499600,0,5,1754496000,20,0,0,0,72000,0,0),(1754506799,1754506799,0,5,1754499600,20,0,0,0,72000,0,0),(1754510400,1754510400,0,5,1754503200,20,0,0,0,72000,0,0),(1754510400,1754510400,0,5,1754506800,20,0,0,0,72000,0,0),(1754514000,1754514000,0,5,1754510400,20,0,0,0,72000,0,0),(1754521199,1754521199,0,5,1754514000,20,0,0,0,72000,0,0),(1754524799,1754524799,0,5,1754517600,20,0,0,0,72000,0,0),(1754528400,1754528400,0,5,1754521200,20,0,0,0,72000,0,0),(1754528400,1754528400,0,5,1754524800,20,0,0,0,72000,0,0),(1754532000,1754532000,0,5,1754528400,20,0,0,0,72000,0,0),(1754539199,1754539199,0,5,1754532000,20,0,0,0,72000,0,0),(1754542799,1754542799,0,5,1754535600,20,0,0,0,72000,0,0),(1754546400,1754546400,0,5,1754539200,215,3451,0,0,252239,0,0),(1754546400,1754546400,0,5,1754542800,416,607632,0,0,423447,0,0),(1754550000,1754550000,0,5,1754546400,416,1421754,0,0,75846,0,0),(1754553600,1754553600,0,5,1754550000,416,218298,0,0,1279302,0,0),(1754557200,1754557200,0,5,1754553600,416,8120,0,0,1489480,0,0),(1754560800,1754560800,0,5,1754557200,416,0,0,0,1497600,0,0),(1754564400,1754564400,0,5,1754560800,416,0,0,0,1497600,0,0),(1754568000,1754568000,0,5,1754564400,416,0,0,0,1497600,0,0),(1754575200,1754575200,0,5,1754568000,416,0,0,0,1497600,0,0),(1754092800,1754092800,0,6,1754086820,0,0,0,0,0,0,0),(1754092800,1754092800,0,6,1754089200,0,0,0,0,0,0,0),(1754096400,1754096400,0,6,1754092800,0,0,0,0,0,0,0),(1754100000,1754100000,0,6,1754096400,0,0,0,0,0,0,0),(1754107200,1754107200,0,6,1754100000,0,0,0,0,0,0,0),(1754107200,1754107200,0,6,1754103600,0,0,0,0,0,0,0),(1754110800,1754110800,0,6,1754107200,0,0,0,0,0,0,0),(1754114400,1754114400,0,6,1754110800,0,0,0,0,0,0,0),(1754121599,1754121599,0,6,1754114400,0,0,0,0,0,0,0),(1754125200,1754125200,0,6,1754118000,0,0,0,0,0,0,0),(1754125200,1754125200,0,6,1754121600,0,0,0,0,0,0,0),(1754128800,1754128800,0,6,1754125200,0,0,0,0,0,0,0),(1754132400,1754132400,0,6,1754128800,0,0,0,0,0,0,0),(1754139599,1754139599,0,6,1754132400,0,0,0,0,0,0,0),(1754143200,1754143200,0,6,1754136000,0,0,0,0,0,0,0),(1754143200,1754143200,0,6,1754139600,0,0,0,0,0,0,0),(1754146800,1754146800,0,6,1754143200,0,0,0,0,0,0,0),(1754150400,1754150400,0,6,1754146800,0,0,0,0,0,0,0),(1754157600,1754157600,0,6,1754150400,0,0,0,0,0,0,0),(1754157600,1754157600,0,6,1754154000,0,0,0,0,0,0,0),(1754161200,1754161200,0,6,1754157600,0,0,0,0,0,0,0),(1754164800,1754164800,0,6,1754161200,0,0,0,0,0,0,0),(1754171999,1754171999,0,6,1754164800,0,0,0,0,0,0,0),(1754175600,1754175600,0,6,1754168400,0,0,0,0,0,0,0),(1754175600,1754175600,0,6,1754172000,0,0,0,0,0,0,0),(1754179200,1754179200,0,6,1754175600,0,0,0,0,0,0,0),(1754182800,1754182800,0,6,1754179200,0,0,0,0,0,0,0),(1754190000,1754190000,0,6,1754182800,0,0,0,0,0,0,0),(1754190000,1754190000,0,6,1754186400,0,0,0,0,0,0,0),(1754193600,1754193600,0,6,1754190000,0,0,0,0,0,0,0),(1754197200,1754197200,0,6,1754193600,0,0,0,0,0,0,0),(1754200800,1754200800,0,6,1754197200,0,0,0,0,0,0,0),(1754208000,1754208000,0,6,1754200800,0,0,0,0,0,0,0),(1754208000,1754208000,0,6,1754204400,0,0,0,0,0,0,0),(1754211600,1754211600,0,6,1754208000,0,0,0,0,0,0,0),(1754215200,1754215200,0,6,1754211600,0,0,0,0,0,0,0),(1754222399,1754222399,0,6,1754215200,0,0,0,0,0,0,0),(1754226000,1754226000,0,6,1754218800,0,0,0,0,0,0,0),(1754226000,1754226000,0,6,1754222400,0,0,0,0,0,0,0),(1754229600,1754229600,0,6,1754226000,0,0,0,0,0,0,0),(1754233200,1754233200,0,6,1754229600,0,0,0,0,0,0,0),(1754240400,1754240400,0,6,1754233200,0,0,0,0,0,0,0),(1754240400,1754240400,0,6,1754236800,0,0,0,0,0,0,0),(1754244000,1754244000,0,6,1754240400,0,0,0,0,0,0,0),(1754247600,1754247600,0,6,1754244000,0,0,0,0,0,0,0),(1754254799,1754254799,0,6,1754247600,0,0,0,0,0,0,0),(1754258400,1754258400,0,6,1754251200,0,0,0,0,0,0,0),(1754258400,1754258400,0,6,1754254800,0,0,0,0,0,0,0),(1754262000,1754262000,0,6,1754258400,0,0,0,0,0,0,0),(1754265600,1754265600,0,6,1754262000,0,0,0,0,0,0,0),(1754272800,1754272800,0,6,1754265600,0,0,0,0,0,0,0),(1754272800,1754272800,0,6,1754269200,0,0,0,0,0,0,0),(1754276400,1754276400,0,6,1754272800,0,0,0,0,0,0,0),(1754280000,1754280000,0,6,1754276400,0,0,0,0,0,0,0),(1754283600,1754283600,0,6,1754280000,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754283600,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754287200,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754290800,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754294400,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754298000,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754301600,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754305200,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754308800,0,0,0,0,0,0,0),(1754318319,1754318319,0,6,1754312400,0,0,0,0,0,0,0),(1754323199,1754323199,0,6,1754316000,0,0,0,0,0,0,0),(1754326799,1754326799,0,6,1754319600,0,0,0,0,0,0,0),(1754330400,1754330400,0,6,1754323200,0,0,0,0,0,0,0),(1754330400,1754330400,0,6,1754326800,0,0,0,0,0,0,0),(1754334000,1754334000,0,6,1754330400,0,0,0,0,0,0,0),(1754341199,1754341199,0,6,1754334000,0,0,0,0,0,0,0),(1754344800,1754344800,0,6,1754337600,0,0,0,0,0,0,0),(1754344800,1754344800,0,6,1754341200,0,0,0,0,0,0,0),(1754348400,1754348400,0,6,1754344800,0,0,0,0,0,0,0),(1754355599,1754355599,0,6,1754348400,0,0,0,0,0,0,0),(1754359199,1754359199,0,6,1754352000,0,0,0,0,0,0,0),(1754362800,1754362800,0,6,1754355600,0,0,0,0,0,0,0),(1754362800,1754362800,0,6,1754359200,0,0,0,0,0,0,0),(1754366400,1754366400,0,6,1754362800,0,0,0,0,0,0,0),(1754370000,1754370000,0,6,1754366400,0,0,0,0,0,0,0),(1754377200,1754377200,0,6,1754370000,0,0,0,0,0,0,0),(1754377200,1754377200,0,6,1754373600,0,0,0,0,0,0,0),(1754380800,1754380800,0,6,1754377200,0,0,0,0,0,0,0),(1754387999,1754387999,0,6,1754380800,0,0,0,0,0,0,0),(1754391599,1754391599,0,6,1754384400,0,0,0,0,0,0,0),(1754395200,1754395200,0,6,1754388000,0,0,0,0,0,0,0),(1754395200,1754395200,0,6,1754391600,0,0,0,0,0,0,0),(1754398800,1754398800,0,6,1754395200,0,0,0,0,0,0,0),(1754405999,1754405999,0,6,1754398800,0,0,0,0,0,0,0),(1754409599,1754409599,0,6,1754402400,0,0,0,0,0,0,0),(1754413200,1754413200,0,6,1754406000,0,0,0,0,0,0,0),(1754413200,1754413200,0,6,1754409600,0,0,0,0,0,0,0),(1754416800,1754416800,0,6,1754413200,0,0,0,0,0,0,0),(1754423999,1754423999,0,6,1754416800,0,0,0,0,0,0,0),(1754427600,1754427600,0,6,1754420400,0,0,0,0,0,0,0),(1754427600,1754427600,0,6,1754424000,0,0,0,0,0,0,0),(1754431200,1754431200,0,6,1754427600,0,0,0,0,0,0,0),(1754438400,1754438400,0,6,1754431200,0,0,0,0,0,0,0),(1754442000,1754442000,0,6,1754434800,0,0,0,0,0,0,0),(1754445600,1754445600,0,6,1754438400,0,0,0,0,0,0,0),(1754445600,1754445600,0,6,1754442000,0,0,0,0,0,0,0),(1754449200,1754449200,0,6,1754445600,0,0,0,0,0,0,0),(1754456399,1754456399,0,6,1754449200,0,0,0,0,0,0,0),(1754460000,1754460000,0,6,1754452800,0,0,0,0,0,0,0),(1754460000,1754460000,0,6,1754456400,0,0,0,0,0,0,0),(1754463600,1754463600,0,6,1754460000,0,0,0,0,0,0,0),(1754467200,1754467200,0,6,1754463600,0,0,0,0,0,0,0),(1754470800,1754470800,0,6,1754467200,0,0,0,0,0,0,0),(1754478000,1754478000,0,6,1754470800,0,0,0,0,0,0,0),(1754478000,1754478000,0,6,1754474400,0,0,0,0,0,0,0),(1754481600,1754481600,0,6,1754478000,0,0,0,0,0,0,0),(1754488799,1754488799,0,6,1754481600,0,0,0,0,0,0,0),(1754492399,1754492399,0,6,1754485200,0,0,0,0,0,0,0),(1754496000,1754496000,0,6,1754488800,0,0,0,0,0,0,0),(1754496000,1754496000,0,6,1754492400,0,0,0,0,0,0,0),(1754499600,1754499600,0,6,1754496000,0,0,0,0,0,0,0),(1754506799,1754506799,0,6,1754499600,0,0,0,0,0,0,0),(1754510400,1754510400,0,6,1754503200,0,0,0,0,0,0,0),(1754510400,1754510400,0,6,1754506800,0,0,0,0,0,0,0),(1754514000,1754514000,0,6,1754510400,0,0,0,0,0,0,0),(1754521199,1754521199,0,6,1754514000,0,0,0,0,0,0,0),(1754524799,1754524799,0,6,1754517600,0,0,0,0,0,0,0),(1754528400,1754528400,0,6,1754521200,0,0,0,0,0,0,0),(1754528400,1754528400,0,6,1754524800,0,0,0,0,0,0,0),(1754532000,1754532000,0,6,1754528400,0,0,0,0,0,0,0),(1754539199,1754539199,0,6,1754532000,0,0,0,0,0,0,0),(1754542799,1754542799,0,6,1754535600,0,0,0,0,0,0,0),(1754546400,1754546400,0,6,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,6,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,6,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,6,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,6,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,6,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,6,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,6,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,6,1754568000,0,0,0,0,0,0,0),(1754092800,1754092800,0,7,1754086820,0,0,0,0,0,0,0),(1754092800,1754092800,0,7,1754089200,0,0,0,0,0,0,0),(1754096400,1754096400,0,7,1754092800,0,0,0,0,0,0,0),(1754100000,1754100000,0,7,1754096400,0,0,0,0,0,0,0),(1754107200,1754107200,0,7,1754100000,0,0,0,0,0,0,0),(1754107200,1754107200,0,7,1754103600,0,0,0,0,0,0,0),(1754110800,1754110800,0,7,1754107200,0,0,0,0,0,0,0),(1754114400,1754114400,0,7,1754110800,0,0,0,0,0,0,0),(1754121599,1754121599,0,7,1754114400,0,0,0,0,0,0,0),(1754125200,1754125200,0,7,1754118000,0,0,0,0,0,0,0),(1754125200,1754125200,0,7,1754121600,0,0,0,0,0,0,0),(1754128800,1754128800,0,7,1754125200,0,0,0,0,0,0,0),(1754132400,1754132400,0,7,1754128800,0,0,0,0,0,0,0),(1754139599,1754139599,0,7,1754132400,0,0,0,0,0,0,0),(1754143200,1754143200,0,7,1754136000,0,0,0,0,0,0,0),(1754143200,1754143200,0,7,1754139600,0,0,0,0,0,0,0),(1754146800,1754146800,0,7,1754143200,0,0,0,0,0,0,0),(1754150400,1754150400,0,7,1754146800,0,0,0,0,0,0,0),(1754157600,1754157600,0,7,1754150400,0,0,0,0,0,0,0),(1754157600,1754157600,0,7,1754154000,0,0,0,0,0,0,0),(1754161200,1754161200,0,7,1754157600,0,0,0,0,0,0,0),(1754164800,1754164800,0,7,1754161200,0,0,0,0,0,0,0),(1754171999,1754171999,0,7,1754164800,0,0,0,0,0,0,0),(1754175600,1754175600,0,7,1754168400,0,0,0,0,0,0,0),(1754175600,1754175600,0,7,1754172000,0,0,0,0,0,0,0),(1754179200,1754179200,0,7,1754175600,0,0,0,0,0,0,0),(1754182800,1754182800,0,7,1754179200,0,0,0,0,0,0,0),(1754190000,1754190000,0,7,1754182800,0,0,0,0,0,0,0),(1754190000,1754190000,0,7,1754186400,0,0,0,0,0,0,0),(1754193600,1754193600,0,7,1754190000,0,0,0,0,0,0,0),(1754197200,1754197200,0,7,1754193600,0,0,0,0,0,0,0),(1754200800,1754200800,0,7,1754197200,0,0,0,0,0,0,0),(1754208000,1754208000,0,7,1754200800,0,0,0,0,0,0,0),(1754208000,1754208000,0,7,1754204400,0,0,0,0,0,0,0),(1754211600,1754211600,0,7,1754208000,0,0,0,0,0,0,0),(1754215200,1754215200,0,7,1754211600,0,0,0,0,0,0,0),(1754222399,1754222399,0,7,1754215200,0,0,0,0,0,0,0),(1754226000,1754226000,0,7,1754218800,0,0,0,0,0,0,0),(1754226000,1754226000,0,7,1754222400,0,0,0,0,0,0,0),(1754229600,1754229600,0,7,1754226000,0,0,0,0,0,0,0),(1754233200,1754233200,0,7,1754229600,0,0,0,0,0,0,0),(1754240400,1754240400,0,7,1754233200,0,0,0,0,0,0,0),(1754240400,1754240400,0,7,1754236800,0,0,0,0,0,0,0),(1754244000,1754244000,0,7,1754240400,0,0,0,0,0,0,0),(1754247600,1754247600,0,7,1754244000,0,0,0,0,0,0,0),(1754254799,1754254799,0,7,1754247600,0,0,0,0,0,0,0),(1754258400,1754258400,0,7,1754251200,0,0,0,0,0,0,0),(1754258400,1754258400,0,7,1754254800,0,0,0,0,0,0,0),(1754262000,1754262000,0,7,1754258400,0,0,0,0,0,0,0),(1754265600,1754265600,0,7,1754262000,0,0,0,0,0,0,0),(1754272800,1754272800,0,7,1754265600,0,0,0,0,0,0,0),(1754272800,1754272800,0,7,1754269200,0,0,0,0,0,0,0),(1754276400,1754276400,0,7,1754272800,0,0,0,0,0,0,0),(1754280000,1754280000,0,7,1754276400,0,0,0,0,0,0,0),(1754283600,1754283600,0,7,1754280000,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754283600,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754287200,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754290800,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754294400,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754298000,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754301600,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754305200,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754308800,0,0,0,0,0,0,0),(1754318319,1754318319,0,7,1754312400,0,0,0,0,0,0,0),(1754323199,1754323199,0,7,1754316000,0,0,0,0,0,0,0),(1754326799,1754326799,0,7,1754319600,0,0,0,0,0,0,0),(1754330400,1754330400,0,7,1754323200,0,0,0,0,0,0,0),(1754330400,1754330400,0,7,1754326800,0,0,0,0,0,0,0),(1754334000,1754334000,0,7,1754330400,0,0,0,0,0,0,0),(1754341199,1754341199,0,7,1754334000,0,0,0,0,0,0,0),(1754344800,1754344800,0,7,1754337600,0,0,0,0,0,0,0),(1754344800,1754344800,0,7,1754341200,0,0,0,0,0,0,0),(1754348400,1754348400,0,7,1754344800,0,0,0,0,0,0,0),(1754355599,1754355599,0,7,1754348400,0,0,0,0,0,0,0),(1754359199,1754359199,0,7,1754352000,0,0,0,0,0,0,0),(1754362800,1754362800,0,7,1754355600,0,0,0,0,0,0,0),(1754362800,1754362800,0,7,1754359200,0,0,0,0,0,0,0),(1754366400,1754366400,0,7,1754362800,0,0,0,0,0,0,0),(1754370000,1754370000,0,7,1754366400,0,0,0,0,0,0,0),(1754377200,1754377200,0,7,1754370000,0,0,0,0,0,0,0),(1754377200,1754377200,0,7,1754373600,0,0,0,0,0,0,0),(1754380800,1754380800,0,7,1754377200,0,0,0,0,0,0,0),(1754387999,1754387999,0,7,1754380800,0,0,0,0,0,0,0),(1754391599,1754391599,0,7,1754384400,0,0,0,0,0,0,0),(1754395200,1754395200,0,7,1754388000,0,0,0,0,0,0,0),(1754395200,1754395200,0,7,1754391600,0,0,0,0,0,0,0),(1754398800,1754398800,0,7,1754395200,0,0,0,0,0,0,0),(1754405999,1754405999,0,7,1754398800,0,0,0,0,0,0,0),(1754409599,1754409599,0,7,1754402400,0,0,0,0,0,0,0),(1754413200,1754413200,0,7,1754406000,0,0,0,0,0,0,0),(1754413200,1754413200,0,7,1754409600,0,0,0,0,0,0,0),(1754416800,1754416800,0,7,1754413200,0,0,0,0,0,0,0),(1754423999,1754423999,0,7,1754416800,0,0,0,0,0,0,0),(1754427600,1754427600,0,7,1754420400,0,0,0,0,0,0,0),(1754427600,1754427600,0,7,1754424000,0,0,0,0,0,0,0),(1754431200,1754431200,0,7,1754427600,0,0,0,0,0,0,0),(1754438400,1754438400,0,7,1754431200,0,0,0,0,0,0,0),(1754442000,1754442000,0,7,1754434800,0,0,0,0,0,0,0),(1754445600,1754445600,0,7,1754438400,0,0,0,0,0,0,0),(1754445600,1754445600,0,7,1754442000,0,0,0,0,0,0,0),(1754449200,1754449200,0,7,1754445600,0,0,0,0,0,0,0),(1754456399,1754456399,0,7,1754449200,0,0,0,0,0,0,0),(1754460000,1754460000,0,7,1754452800,0,0,0,0,0,0,0),(1754460000,1754460000,0,7,1754456400,0,0,0,0,0,0,0),(1754463600,1754463600,0,7,1754460000,0,0,0,0,0,0,0),(1754467200,1754467200,0,7,1754463600,0,0,0,0,0,0,0),(1754470800,1754470800,0,7,1754467200,0,0,0,0,0,0,0),(1754478000,1754478000,0,7,1754470800,0,0,0,0,0,0,0),(1754478000,1754478000,0,7,1754474400,0,0,0,0,0,0,0),(1754481600,1754481600,0,7,1754478000,0,0,0,0,0,0,0),(1754488799,1754488799,0,7,1754481600,0,0,0,0,0,0,0),(1754492399,1754492399,0,7,1754485200,0,0,0,0,0,0,0),(1754496000,1754496000,0,7,1754488800,0,0,0,0,0,0,0),(1754496000,1754496000,0,7,1754492400,0,0,0,0,0,0,0),(1754499600,1754499600,0,7,1754496000,0,0,0,0,0,0,0),(1754506799,1754506799,0,7,1754499600,0,0,0,0,0,0,0),(1754510400,1754510400,0,7,1754503200,0,0,0,0,0,0,0),(1754510400,1754510400,0,7,1754506800,0,0,0,0,0,0,0),(1754514000,1754514000,0,7,1754510400,0,0,0,0,0,0,0),(1754521199,1754521199,0,7,1754514000,0,0,0,0,0,0,0),(1754524799,1754524799,0,7,1754517600,0,0,0,0,0,0,0),(1754528400,1754528400,0,7,1754521200,0,0,0,0,0,0,0),(1754528400,1754528400,0,7,1754524800,0,0,0,0,0,0,0),(1754532000,1754532000,0,7,1754528400,0,0,0,0,0,0,0),(1754539199,1754539199,0,7,1754532000,0,0,0,0,0,0,0),(1754542799,1754542799,0,7,1754535600,0,0,0,0,0,0,0),(1754546400,1754546400,0,7,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,7,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,7,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,7,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,7,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,7,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,7,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,7,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,7,1754568000,0,0,0,0,0,0,0),(1754092800,1754092800,0,8,1754086820,0,0,0,0,0,0,0),(1754092800,1754092800,0,8,1754089200,0,0,0,0,0,0,0),(1754096400,1754096400,0,8,1754092800,0,0,0,0,0,0,0),(1754100000,1754100000,0,8,1754096400,0,0,0,0,0,0,0),(1754107200,1754107200,0,8,1754100000,0,0,0,0,0,0,0),(1754107200,1754107200,0,8,1754103600,0,0,0,0,0,0,0),(1754110800,1754110800,0,8,1754107200,0,0,0,0,0,0,0),(1754114400,1754114400,0,8,1754110800,0,0,0,0,0,0,0),(1754121599,1754121599,0,8,1754114400,0,0,0,0,0,0,0),(1754125200,1754125200,0,8,1754118000,0,0,0,0,0,0,0),(1754125200,1754125200,0,8,1754121600,0,0,0,0,0,0,0),(1754128800,1754128800,0,8,1754125200,0,0,0,0,0,0,0),(1754132400,1754132400,0,8,1754128800,0,0,0,0,0,0,0),(1754139599,1754139599,0,8,1754132400,0,0,0,0,0,0,0),(1754143200,1754143200,0,8,1754136000,0,0,0,0,0,0,0),(1754143200,1754143200,0,8,1754139600,0,0,0,0,0,0,0),(1754146800,1754146800,0,8,1754143200,0,0,0,0,0,0,0),(1754150400,1754150400,0,8,1754146800,0,0,0,0,0,0,0),(1754157600,1754157600,0,8,1754150400,0,0,0,0,0,0,0),(1754157600,1754157600,0,8,1754154000,0,0,0,0,0,0,0),(1754161200,1754161200,0,8,1754157600,0,0,0,0,0,0,0),(1754164800,1754164800,0,8,1754161200,0,0,0,0,0,0,0),(1754171999,1754171999,0,8,1754164800,0,0,0,0,0,0,0),(1754175600,1754175600,0,8,1754168400,0,0,0,0,0,0,0),(1754175600,1754175600,0,8,1754172000,0,0,0,0,0,0,0),(1754179200,1754179200,0,8,1754175600,0,0,0,0,0,0,0),(1754182800,1754182800,0,8,1754179200,0,0,0,0,0,0,0),(1754190000,1754190000,0,8,1754182800,0,0,0,0,0,0,0),(1754190000,1754190000,0,8,1754186400,0,0,0,0,0,0,0),(1754193600,1754193600,0,8,1754190000,0,0,0,0,0,0,0),(1754197200,1754197200,0,8,1754193600,0,0,0,0,0,0,0),(1754200800,1754200800,0,8,1754197200,0,0,0,0,0,0,0),(1754208000,1754208000,0,8,1754200800,0,0,0,0,0,0,0),(1754208000,1754208000,0,8,1754204400,0,0,0,0,0,0,0),(1754211600,1754211600,0,8,1754208000,0,0,0,0,0,0,0),(1754215200,1754215200,0,8,1754211600,0,0,0,0,0,0,0),(1754222399,1754222399,0,8,1754215200,0,0,0,0,0,0,0),(1754226000,1754226000,0,8,1754218800,0,0,0,0,0,0,0),(1754226000,1754226000,0,8,1754222400,0,0,0,0,0,0,0),(1754229600,1754229600,0,8,1754226000,0,0,0,0,0,0,0),(1754233200,1754233200,0,8,1754229600,0,0,0,0,0,0,0),(1754240400,1754240400,0,8,1754233200,0,0,0,0,0,0,0),(1754240400,1754240400,0,8,1754236800,0,0,0,0,0,0,0),(1754244000,1754244000,0,8,1754240400,0,0,0,0,0,0,0),(1754247600,1754247600,0,8,1754244000,0,0,0,0,0,0,0),(1754254799,1754254799,0,8,1754247600,0,0,0,0,0,0,0),(1754258400,1754258400,0,8,1754251200,0,0,0,0,0,0,0),(1754258400,1754258400,0,8,1754254800,0,0,0,0,0,0,0),(1754262000,1754262000,0,8,1754258400,0,0,0,0,0,0,0),(1754265600,1754265600,0,8,1754262000,0,0,0,0,0,0,0),(1754272800,1754272800,0,8,1754265600,0,0,0,0,0,0,0),(1754272800,1754272800,0,8,1754269200,0,0,0,0,0,0,0),(1754276400,1754276400,0,8,1754272800,0,0,0,0,0,0,0),(1754280000,1754280000,0,8,1754276400,0,0,0,0,0,0,0),(1754283600,1754283600,0,8,1754280000,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754283600,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754287200,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754290800,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754294400,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754298000,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754301600,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754305200,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754308800,0,0,0,0,0,0,0),(1754318319,1754318319,0,8,1754312400,0,0,0,0,0,0,0),(1754323199,1754323199,0,8,1754316000,0,0,0,0,0,0,0),(1754326799,1754326799,0,8,1754319600,0,0,0,0,0,0,0),(1754330400,1754330400,0,8,1754323200,0,0,0,0,0,0,0),(1754330400,1754330400,0,8,1754326800,0,0,0,0,0,0,0),(1754334000,1754334000,0,8,1754330400,0,0,0,0,0,0,0),(1754341199,1754341199,0,8,1754334000,0,0,0,0,0,0,0),(1754344800,1754344800,0,8,1754337600,0,0,0,0,0,0,0),(1754344800,1754344800,0,8,1754341200,0,0,0,0,0,0,0),(1754348400,1754348400,0,8,1754344800,0,0,0,0,0,0,0),(1754355599,1754355599,0,8,1754348400,0,0,0,0,0,0,0),(1754359199,1754359199,0,8,1754352000,0,0,0,0,0,0,0),(1754362800,1754362800,0,8,1754355600,0,0,0,0,0,0,0),(1754362800,1754362800,0,8,1754359200,0,0,0,0,0,0,0),(1754366400,1754366400,0,8,1754362800,0,0,0,0,0,0,0),(1754370000,1754370000,0,8,1754366400,0,0,0,0,0,0,0),(1754377200,1754377200,0,8,1754370000,0,0,0,0,0,0,0),(1754377200,1754377200,0,8,1754373600,0,0,0,0,0,0,0),(1754380800,1754380800,0,8,1754377200,0,0,0,0,0,0,0),(1754387999,1754387999,0,8,1754380800,0,0,0,0,0,0,0),(1754391599,1754391599,0,8,1754384400,0,0,0,0,0,0,0),(1754395200,1754395200,0,8,1754388000,0,0,0,0,0,0,0),(1754395200,1754395200,0,8,1754391600,0,0,0,0,0,0,0),(1754398800,1754398800,0,8,1754395200,0,0,0,0,0,0,0),(1754405999,1754405999,0,8,1754398800,0,0,0,0,0,0,0),(1754409599,1754409599,0,8,1754402400,0,0,0,0,0,0,0),(1754413200,1754413200,0,8,1754406000,0,0,0,0,0,0,0),(1754413200,1754413200,0,8,1754409600,0,0,0,0,0,0,0),(1754416800,1754416800,0,8,1754413200,0,0,0,0,0,0,0),(1754423999,1754423999,0,8,1754416800,0,0,0,0,0,0,0),(1754427600,1754427600,0,8,1754420400,0,0,0,0,0,0,0),(1754427600,1754427600,0,8,1754424000,0,0,0,0,0,0,0),(1754431200,1754431200,0,8,1754427600,0,0,0,0,0,0,0),(1754438400,1754438400,0,8,1754431200,0,0,0,0,0,0,0),(1754442000,1754442000,0,8,1754434800,0,0,0,0,0,0,0),(1754445600,1754445600,0,8,1754438400,0,0,0,0,0,0,0),(1754445600,1754445600,0,8,1754442000,0,0,0,0,0,0,0),(1754449200,1754449200,0,8,1754445600,0,0,0,0,0,0,0),(1754456399,1754456399,0,8,1754449200,0,0,0,0,0,0,0),(1754460000,1754460000,0,8,1754452800,0,0,0,0,0,0,0),(1754460000,1754460000,0,8,1754456400,0,0,0,0,0,0,0),(1754463600,1754463600,0,8,1754460000,0,0,0,0,0,0,0),(1754467200,1754467200,0,8,1754463600,0,0,0,0,0,0,0),(1754470800,1754470800,0,8,1754467200,0,0,0,0,0,0,0),(1754478000,1754478000,0,8,1754470800,0,0,0,0,0,0,0),(1754478000,1754478000,0,8,1754474400,0,0,0,0,0,0,0),(1754481600,1754481600,0,8,1754478000,0,0,0,0,0,0,0),(1754488799,1754488799,0,8,1754481600,0,0,0,0,0,0,0),(1754492399,1754492399,0,8,1754485200,0,0,0,0,0,0,0),(1754496000,1754496000,0,8,1754488800,0,0,0,0,0,0,0),(1754496000,1754496000,0,8,1754492400,0,0,0,0,0,0,0),(1754499600,1754499600,0,8,1754496000,0,0,0,0,0,0,0),(1754506799,1754506799,0,8,1754499600,0,0,0,0,0,0,0),(1754510400,1754510400,0,8,1754503200,0,0,0,0,0,0,0),(1754510400,1754510400,0,8,1754506800,0,0,0,0,0,0,0),(1754514000,1754514000,0,8,1754510400,0,0,0,0,0,0,0),(1754521199,1754521199,0,8,1754514000,0,0,0,0,0,0,0),(1754524799,1754524799,0,8,1754517600,0,0,0,0,0,0,0),(1754528400,1754528400,0,8,1754521200,0,0,0,0,0,0,0),(1754528400,1754528400,0,8,1754524800,0,0,0,0,0,0,0),(1754532000,1754532000,0,8,1754528400,0,0,0,0,0,0,0),(1754539199,1754539199,0,8,1754532000,0,0,0,0,0,0,0),(1754542799,1754542799,0,8,1754535600,0,0,0,0,0,0,0),(1754546400,1754546400,0,8,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,8,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,8,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,8,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,8,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,8,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,8,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,8,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,8,1754568000,0,0,0,0,0,0,0),(1754546400,1754546400,0,1001,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,1001,1754542800,1,0,0,0,1932,0,0),(1754550000,1754550000,0,1001,1754546400,1,3426,0,0,174,0,0),(1754553600,1754553600,0,1001,1754550000,1,203,0,0,3397,0,0),(1754557200,1754557200,0,1001,1754553600,1,0,0,0,3600,0,0),(1754560800,1754560800,0,1001,1754557200,1,0,0,0,3600,0,0),(1754564400,1754564400,0,1001,1754560800,1,0,0,0,3600,0,0),(1754568000,1754568000,0,1001,1754564400,1,0,0,0,3600,0,0),(1754575200,1754575200,0,1001,1754568000,1,0,0,0,3600,0,0),(1754546400,1754546400,0,1002,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,1002,1754542800,1,0,0,0,1932,0,0),(1754550000,1754550000,0,1002,1754546400,1,3426,0,0,174,0,0),(1754553600,1754553600,0,1002,1754550000,1,203,0,0,3397,0,0),(1754557200,1754557200,0,1002,1754553600,1,0,0,0,3600,0,0),(1754560800,1754560800,0,1002,1754557200,1,0,0,0,3600,0,0),(1754564400,1754564400,0,1002,1754560800,1,0,0,0,3600,0,0),(1754568000,1754568000,0,1002,1754564400,1,0,0,0,3600,0,0),(1754575200,1754575200,0,1002,1754568000,1,0,0,0,3600,0,0),(1754546400,1754546400,0,1003,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,1003,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,1003,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,1003,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,1003,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,1003,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,1003,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,1003,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,1003,1754568000,0,0,0,0,0,0,0),(1754546400,1754546400,0,1004,1754539200,0,0,0,0,0,0,0),(1754546400,1754546400,0,1004,1754542800,0,0,0,0,0,0,0),(1754550000,1754550000,0,1004,1754546400,0,0,0,0,0,0,0),(1754553600,1754553600,0,1004,1754550000,0,0,0,0,0,0,0),(1754557200,1754557200,0,1004,1754553600,0,0,0,0,0,0,0),(1754560800,1754560800,0,1004,1754557200,0,0,0,0,0,0,0),(1754564400,1754564400,0,1004,1754560800,0,0,0,0,0,0,0),(1754568000,1754568000,0,1004,1754564400,0,0,0,0,0,0,0),(1754575200,1754575200,0,1004,1754568000,0,0,0,0,0,0,0);
/*!40000 ALTER TABLE `localcluster_usage_hour_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_usage_month_table`
--

DROP TABLE IF EXISTS `localcluster_usage_month_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_usage_month_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL,
  `time_start` bigint(20) unsigned NOT NULL,
  `count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `down_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `pdown_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `idle_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `plan_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  `over_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_usage_month_table`
--

LOCK TABLES `localcluster_usage_month_table` WRITE;
/*!40000 ALTER TABLE `localcluster_usage_month_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_usage_month_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_wckey_table`
--

DROP TABLE IF EXISTS `localcluster_wckey_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_wckey_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `is_def` tinyint(4) NOT NULL DEFAULT 0,
  `id_wckey` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `wckey_name` tinytext NOT NULL DEFAULT '',
  `user` tinytext NOT NULL,
  PRIMARY KEY (`id_wckey`),
  UNIQUE KEY `udex` (`wckey_name`(42),`user`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_wckey_table`
--

LOCK TABLES `localcluster_wckey_table` WRITE;
/*!40000 ALTER TABLE `localcluster_wckey_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_wckey_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_wckey_usage_day_table`
--

DROP TABLE IF EXISTS `localcluster_wckey_usage_day_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_wckey_usage_day_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_wckey_usage_day_table`
--

LOCK TABLES `localcluster_wckey_usage_day_table` WRITE;
/*!40000 ALTER TABLE `localcluster_wckey_usage_day_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_wckey_usage_day_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_wckey_usage_hour_table`
--

DROP TABLE IF EXISTS `localcluster_wckey_usage_hour_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_wckey_usage_hour_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_wckey_usage_hour_table`
--

LOCK TABLES `localcluster_wckey_usage_hour_table` WRITE;
/*!40000 ALTER TABLE `localcluster_wckey_usage_hour_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_wckey_usage_hour_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localcluster_wckey_usage_month_table`
--

DROP TABLE IF EXISTS `localcluster_wckey_usage_month_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localcluster_wckey_usage_month_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(10) unsigned NOT NULL,
  `id_alt` int(10) unsigned NOT NULL DEFAULT 0,
  `id_tres` int(11) NOT NULL DEFAULT 1,
  `time_start` bigint(20) unsigned NOT NULL,
  `alloc_secs` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`id_tres`,`time_start`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`mod_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localcluster_wckey_usage_month_table`
--

LOCK TABLES `localcluster_wckey_usage_month_table` WRITE;
/*!40000 ALTER TABLE `localcluster_wckey_usage_month_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `localcluster_wckey_usage_month_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qos_table`
--

DROP TABLE IF EXISTS `qos_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `qos_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` tinytext NOT NULL,
  `description` text DEFAULT NULL,
  `flags` int(10) unsigned DEFAULT 0,
  `grace_time` int(10) unsigned DEFAULT NULL,
  `max_jobs_pa` int(11) DEFAULT NULL,
  `max_jobs_per_user` int(11) DEFAULT NULL,
  `max_jobs_accrue_pa` int(11) DEFAULT NULL,
  `max_jobs_accrue_pu` int(11) DEFAULT NULL,
  `min_prio_thresh` int(11) DEFAULT NULL,
  `max_submit_jobs_pa` int(11) DEFAULT NULL,
  `max_submit_jobs_per_user` int(11) DEFAULT NULL,
  `max_tres_pa` text NOT NULL DEFAULT '',
  `max_tres_pj` text NOT NULL DEFAULT '',
  `max_tres_pn` text NOT NULL DEFAULT '',
  `max_tres_pu` text NOT NULL DEFAULT '',
  `max_tres_mins_pj` text NOT NULL DEFAULT '',
  `max_tres_run_mins_pa` text NOT NULL DEFAULT '',
  `max_tres_run_mins_pu` text NOT NULL DEFAULT '',
  `min_tres_pj` text NOT NULL DEFAULT '',
  `max_wall_duration_per_job` int(11) DEFAULT NULL,
  `grp_jobs` int(11) DEFAULT NULL,
  `grp_jobs_accrue` int(11) DEFAULT NULL,
  `grp_submit_jobs` int(11) DEFAULT NULL,
  `grp_tres` text NOT NULL DEFAULT '',
  `grp_tres_mins` text NOT NULL DEFAULT '',
  `grp_tres_run_mins` text NOT NULL DEFAULT '',
  `grp_wall` int(11) DEFAULT NULL,
  `preempt` text NOT NULL DEFAULT '',
  `preempt_mode` int(11) DEFAULT 0,
  `preempt_exempt_time` int(10) unsigned DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT 0,
  `usage_factor` double NOT NULL DEFAULT 1,
  `usage_thres` double DEFAULT NULL,
  `limit_factor` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `udex` (`name`(42))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qos_table`
--

LOCK TABLES `qos_table` WRITE;
/*!40000 ALTER TABLE `qos_table` DISABLE KEYS */;
INSERT INTO `qos_table` VALUES (1754086818,1754086818,0,1,'normal','Normal QOS default',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'','','','','','','','',NULL,NULL,NULL,NULL,'','','',NULL,'',0,NULL,0,1,NULL,NULL);
/*!40000 ALTER TABLE `qos_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `res_table`
--

DROP TABLE IF EXISTS `res_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `res_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` tinytext NOT NULL,
  `description` text DEFAULT NULL,
  `manager` tinytext NOT NULL,
  `server` tinytext NOT NULL,
  `count` int(10) unsigned DEFAULT 0,
  `type` int(10) unsigned DEFAULT 0,
  `flags` int(10) unsigned DEFAULT 0,
  `last_consumed` int(10) unsigned DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `udex` (`name`(42),`server`(42),`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `res_table`
--

LOCK TABLES `res_table` WRITE;
/*!40000 ALTER TABLE `res_table` DISABLE KEYS */;
/*!40000 ALTER TABLE `res_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_defs_table`
--

DROP TABLE IF EXISTS `table_defs_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `table_defs_table` (
  `creation_time` int(10) unsigned NOT NULL,
  `mod_time` int(10) unsigned NOT NULL DEFAULT 0,
  `table_name` text NOT NULL,
  `definition` text NOT NULL,
  PRIMARY KEY (`table_name`(50))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_defs_table`
--

LOCK TABLES `table_defs_table` WRITE;
/*!40000 ALTER TABLE `table_defs_table` DISABLE KEYS */;
INSERT INTO `table_defs_table` VALUES (1754086820,1754086820,'\"localcluster_assoc_table\"','alter table \"localcluster_assoc_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `comment` text, modify `flags` int unsigned default 0 not null, modify `is_def` tinyint default 0 not null, modify `id_assoc` int unsigned not null auto_increment, modify `user` tinytext not null default \'\', modify `acct` tinytext not null, modify `partition` tinytext not null default \'\', modify `parent_acct` tinytext not null default \'\', modify `id_parent` int unsigned not null, modify `lineage` text, modify `shares` int default 1 not null, modify `max_jobs` int default NULL, modify `max_jobs_accrue` int default NULL, modify `min_prio_thresh` int default NULL, modify `max_submit_jobs` int default NULL, modify `max_tres_pj` text not null default \'\', modify `max_tres_pn` text not null default \'\', modify `max_tres_mins_pj` text not null default \'\', modify `max_tres_run_mins` text not null default \'\', modify `max_wall_pj` int default NULL, modify `grp_jobs` int default NULL, modify `grp_jobs_accrue` int default NULL, modify `grp_submit_jobs` int default NULL, modify `grp_tres` text not null default \'\', modify `grp_tres_mins` text not null default \'\', modify `grp_tres_run_mins` text not null default \'\', modify `grp_wall` int default NULL, modify `priority` int unsigned default NULL, modify `def_qos_id` int default NULL, modify `qos` blob not null default \'\', modify `delta_qos` blob not null default \'\', drop primary key, add primary key (id_assoc), drop index udex, add unique index udex (user(42), acct(42), `partition`(42));'),(1754086820,1754086820,'\"localcluster_assoc_usage_day_table\"','alter table \"localcluster_assoc_usage_day_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_assoc_usage_hour_table\"','alter table \"localcluster_assoc_usage_hour_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_assoc_usage_month_table\"','alter table \"localcluster_assoc_usage_month_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_event_table\"','alter table \"localcluster_event_table\" modify `deleted` tinyint default 0 not null, modify `time_start` bigint unsigned not null, modify `time_end` bigint unsigned default 0 not null, modify `node_name` tinytext default \'\' not null, modify `extra` text, modify `cluster_nodes` text not null default \'\', modify `instance_id` text, modify `instance_type` text, modify `reason` tinytext not null, modify `reason_uid` int unsigned default 0xfffffffe not null, modify `state` int unsigned default 0 not null, modify `tres` text not null default \'\', drop primary key, add primary key (node_name(42), time_start), drop key rollup, add key rollup (time_start, time_end, state), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (time_end);'),(1754086820,1754086820,'\"localcluster_job_env_table\"','alter table \"localcluster_job_env_table\" modify `deleted` tinyint default 0 not null, modify `hash_inx` bigint unsigned not null auto_increment, modify `last_used` timestamp DEFAULT CURRENT_TIMESTAMP not null, modify `env_hash` text not null, modify `env_vars` longtext, drop primary key, add primary key (hash_inx), drop index env_hash_inx, add unique index env_hash_inx (env_hash(66)), drop key archive_delete, add key archive_delete (deleted);'),(1754086820,1754086820,'\"localcluster_job_script_table\"','alter table \"localcluster_job_script_table\" modify `deleted` tinyint default 0 not null, modify `hash_inx` bigint unsigned not null auto_increment, modify `last_used` timestamp DEFAULT CURRENT_TIMESTAMP not null, modify `script_hash` text not null, modify `batch_script` longtext, drop primary key, add primary key (hash_inx), drop index script_hash_inx, add unique index script_hash_inx (script_hash(66)), drop key archive_delete, add key archive_delete (deleted);'),(1754086820,1754086820,'\"localcluster_job_table\"','alter table \"localcluster_job_table\" modify `job_db_inx` bigint unsigned not null auto_increment, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `account` tinytext, modify `admin_comment` text, modify `array_task_str` text, modify `array_max_tasks` int unsigned default 0 not null, modify `array_task_pending` int unsigned default 0 not null, modify `constraints` text default \'\', modify `container` text, modify `cpus_req` int unsigned not null, modify `derived_ec` int unsigned default 0 not null, modify `derived_es` text, modify `env_hash_inx` bigint unsigned default 0 not null, modify `exit_code` int unsigned default 0 not null, modify `extra` text, modify `flags` int unsigned default 0 not null, modify `failed_node` tinytext, modify `job_name` tinytext not null, modify `id_assoc` int unsigned not null, modify `id_array_job` int unsigned default 0 not null, modify `id_array_task` int unsigned default 0xfffffffe not null, modify `id_block` tinytext, modify `id_job` int unsigned not null, modify `id_qos` int unsigned default 0 not null, modify `id_resv` int unsigned not null, modify `id_wckey` int unsigned not null, modify `id_user` int unsigned not null, modify `id_group` int unsigned not null, modify `het_job_id` int unsigned not null, modify `het_job_offset` int unsigned not null, modify `kill_requid` int unsigned default null, modify `state_reason_prev` int unsigned not null, modify `licenses` text, modify `mcs_label` tinytext default \'\', modify `mem_req` bigint unsigned default 0 not null, modify `nodelist` text, modify `nodes_alloc` int unsigned not null, modify `node_inx` text, modify `partition` tinytext not null, modify `priority` int unsigned not null, modify `qos_req` text, modify `restart_cnt` smallint unsigned default 0, modify `resv_req` text, modify `script_hash_inx` bigint unsigned default 0 not null, modify `state` int unsigned not null, modify `timelimit` int unsigned default 0 not null, modify `time_submit` bigint unsigned default 0 not null, modify `time_eligible` bigint unsigned default 0 not null, modify `time_start` bigint unsigned default 0 not null, modify `time_end` bigint unsigned default 0 not null, modify `time_suspended` bigint unsigned default 0 not null, modify `gres_used` text not null default \'\', modify `wckey` tinytext not null default \'\', modify `work_dir` text not null default \'\', modify `segment_size` smallint unsigned default 0 not null, modify `std_err` text not null default \'\', modify `std_in` text not null default \'\', modify `std_out` text not null default \'\', modify `submit_line` longtext, modify `system_comment` text, modify `tres_alloc` text not null default \'\', modify `tres_req` text not null default \'\', drop primary key, add primary key (job_db_inx), drop index id_job, add unique index (id_job, time_submit), drop key old_tuple, add key old_tuple (id_job, id_assoc, time_submit), drop key rollup, add key rollup (time_eligible, time_end), drop key rollup2, add key rollup2 (time_end, time_eligible), drop key nodes_alloc, add key nodes_alloc (nodes_alloc), drop key wckey, add key wckey (id_wckey), drop key qos, add key qos (id_qos), drop key association, add key association (id_assoc), drop key array_job, add key array_job (id_array_job), drop key het_job, add key het_job (het_job_id), drop key reserv, add key reserv (id_resv), drop key sacct_def, add key sacct_def (id_user, time_start, time_end), drop key sacct_def2, add key sacct_def2 (id_user, time_end, time_eligible), drop key env_hash_inx, add key env_hash_inx (env_hash_inx), drop key script_hash_inx, add key script_hash_inx (script_hash_inx), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (time_end);'),(1754086820,1754086820,'\"localcluster_last_ran_table\"','alter table \"localcluster_last_ran_table\" modify `hourly_rollup` bigint unsigned default 0 not null, modify `daily_rollup` bigint unsigned default 0 not null, modify `monthly_rollup` bigint unsigned default 0 not null, drop primary key, add primary key (hourly_rollup, daily_rollup, monthly_rollup);'),(1754086820,1754086820,'\"localcluster_qos_usage_day_table\"','alter table \"localcluster_qos_usage_day_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_alt, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_qos_usage_hour_table\"','alter table \"localcluster_qos_usage_hour_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_alt, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_qos_usage_month_table\"','alter table \"localcluster_qos_usage_month_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_alt, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_resv_table\"','alter table \"localcluster_resv_table\" modify `id_resv` int unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `assoclist` text not null default \'\', modify `flags` bigint unsigned default 0 not null, modify `nodelist` text not null default \'\', modify `node_inx` text not null default \'\', modify `resv_name` text not null, modify `time_start` bigint unsigned default 0 not null, modify `time_end` bigint unsigned default 0 not null, modify `time_force` bigint unsigned default 0 not null, modify `tres` text not null default \'\', modify `unused_wall` double unsigned default 0.0 not null, modify `comment` text, drop primary key, add primary key (id_resv, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (time_end);'),(1754086820,1754086820,'\"localcluster_step_table\"','alter table \"localcluster_step_table\" modify `job_db_inx` bigint unsigned not null, modify `deleted` tinyint default 0 not null, modify `exit_code` int default 0 not null, modify `id_step` int not null, modify `step_het_comp` int unsigned default 0xfffffffe not null, modify `kill_requid` int unsigned default null, modify `nodelist` text not null, modify `nodes_alloc` int unsigned not null, modify `node_inx` text, modify `state` smallint unsigned not null, modify `step_name` text not null, modify `task_cnt` int unsigned not null, modify `task_dist` int default 0 not null, modify `time_start` bigint unsigned default 0 not null, modify `time_end` bigint unsigned default 0 not null, modify `time_suspended` bigint unsigned default 0 not null, modify `timelimit` int unsigned default 0 not null, modify `user_sec` bigint unsigned default 0 not null, modify `user_usec` int unsigned default 0 not null, modify `sys_sec` bigint unsigned default 0 not null, modify `sys_usec` int unsigned default 0 not null, modify `act_cpufreq` double unsigned default 0.0 not null, modify `consumed_energy` bigint unsigned default 0 not null, modify `container` text, modify `req_cpufreq_min` int unsigned default 0 not null, modify `req_cpufreq` int unsigned default 0 not null, modify `req_cpufreq_gov` int unsigned default 0 not null, modify `cwd` text not null default \'\', modify `std_err` text not null default \'\', modify `std_in` text not null default \'\', modify `std_out` text not null default \'\', modify `submit_line` longtext, modify `tres_alloc` text not null default \'\', modify `tres_usage_in_ave` text not null default \'\', modify `tres_usage_in_max` text not null default \'\', modify `tres_usage_in_max_taskid` text not null default \'\', modify `tres_usage_in_max_nodeid` text not null default \'\', modify `tres_usage_in_min` text not null default \'\', modify `tres_usage_in_min_taskid` text not null default \'\', modify `tres_usage_in_min_nodeid` text not null default \'\', modify `tres_usage_in_tot` text not null default \'\', modify `tres_usage_out_ave` text not null default \'\', modify `tres_usage_out_max` text not null default \'\', modify `tres_usage_out_max_taskid` text not null default \'\', modify `tres_usage_out_max_nodeid` text not null default \'\', modify `tres_usage_out_min` text not null default \'\', modify `tres_usage_out_min_taskid` text not null default \'\', modify `tres_usage_out_min_nodeid` text not null default \'\', modify `tres_usage_out_tot` text not null default \'\', drop primary key, add primary key (job_db_inx, id_step, step_het_comp), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (time_end);'),(1754086820,1754086820,'\"localcluster_suspend_table\"','alter table \"localcluster_suspend_table\" modify `deleted` tinyint default 0 not null, modify `job_db_inx` bigint unsigned not null, modify `id_assoc` int not null, modify `time_start` bigint unsigned default 0 not null, modify `time_end` bigint unsigned default 0 not null, drop primary key, add primary key (job_db_inx, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (time_end);'),(1754086820,1754086820,'\"localcluster_usage_day_table\"','alter table \"localcluster_usage_day_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id_tres` int not null, modify `time_start` bigint unsigned not null, modify `count` bigint unsigned default 0 not null, modify `alloc_secs` bigint unsigned default 0 not null, modify `down_secs` bigint unsigned default 0 not null, modify `pdown_secs` bigint unsigned default 0 not null, modify `idle_secs` bigint unsigned default 0 not null, modify `plan_secs` bigint unsigned default 0 not null, modify `over_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_usage_hour_table\"','alter table \"localcluster_usage_hour_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id_tres` int not null, modify `time_start` bigint unsigned not null, modify `count` bigint unsigned default 0 not null, modify `alloc_secs` bigint unsigned default 0 not null, modify `down_secs` bigint unsigned default 0 not null, modify `pdown_secs` bigint unsigned default 0 not null, modify `idle_secs` bigint unsigned default 0 not null, modify `plan_secs` bigint unsigned default 0 not null, modify `over_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_usage_month_table\"','alter table \"localcluster_usage_month_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id_tres` int not null, modify `time_start` bigint unsigned not null, modify `count` bigint unsigned default 0 not null, modify `alloc_secs` bigint unsigned default 0 not null, modify `down_secs` bigint unsigned default 0 not null, modify `pdown_secs` bigint unsigned default 0 not null, modify `idle_secs` bigint unsigned default 0 not null, modify `plan_secs` bigint unsigned default 0 not null, modify `over_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_wckey_table\"','alter table \"localcluster_wckey_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `is_def` tinyint default 0 not null, modify `id_wckey` int unsigned not null auto_increment, modify `wckey_name` tinytext not null default \'\', modify `user` tinytext not null, drop primary key, add primary key (id_wckey), drop index udex, add unique index udex (wckey_name(42), user(42));'),(1754086820,1754086820,'\"localcluster_wckey_usage_day_table\"','alter table \"localcluster_wckey_usage_day_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_wckey_usage_hour_table\"','alter table \"localcluster_wckey_usage_hour_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086820,1754086820,'\"localcluster_wckey_usage_month_table\"','alter table \"localcluster_wckey_usage_month_table\" modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0 not null, modify `id` int unsigned not null, modify `id_alt` int unsigned default 0 not null, modify `id_tres` int default 1 not null, modify `time_start` bigint unsigned not null, modify `alloc_secs` bigint unsigned default 0 not null, drop primary key, add primary key (id, id_tres, time_start), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (mod_time);'),(1754086818,1754086818,'acct_coord_table','alter table acct_coord_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `acct` tinytext not null, modify `user` tinytext not null, drop primary key, add primary key (acct(42), user(42)), drop key user, add key user (user(42));'),(1754086818,1754086818,'acct_table','alter table acct_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `flags` int unsigned default 0, modify `name` tinytext not null, modify `description` text not null, modify `organization` text not null, drop primary key, add primary key (name(42));'),(1754086818,1754086818,'cluster_table','alter table cluster_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `name` tinytext not null, modify `id` smallint, modify `control_host` tinytext not null default \'\', modify `control_port` int unsigned not null default 0, modify `last_port` int unsigned not null default 0, modify `rpc_version` smallint unsigned not null default 0, modify `classification` smallint unsigned default 0, modify `dimensions` smallint unsigned default 1, modify `flags` int unsigned default 0, modify `federation` tinytext not null, modify `features` text not null default \'\', modify `fed_id` int unsigned default 0 not null, modify `fed_state` smallint unsigned not null, drop primary key, add primary key (name(42));'),(1754086818,1754086818,'clus_res_table','alter table clus_res_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `cluster` tinytext not null, modify `res_id` int not null, modify `allowed` int unsigned default 0, drop primary key, add primary key (res_id, cluster(42));'),(1754086818,1754086818,'convert_version_table','alter table convert_version_table modify `mod_time` bigint unsigned default 0 not null, modify `version` int default 0, drop primary key, add primary key (version);'),(1754086818,1754086818,'federation_table','alter table federation_table modify `creation_time` int unsigned not null, modify `mod_time` int unsigned default 0 not null, modify `deleted` tinyint default 0, modify `name` tinytext not null, modify `flags` int unsigned default 0, drop primary key, add primary key (name(42));'),(1754086818,1754086818,'qos_table','alter table qos_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `id` int not null auto_increment, modify `name` tinytext not null, modify `description` text, modify `flags` int unsigned default 0, modify `grace_time` int unsigned default NULL, modify `max_jobs_pa` int default NULL, modify `max_jobs_per_user` int default NULL, modify `max_jobs_accrue_pa` int default NULL, modify `max_jobs_accrue_pu` int default NULL, modify `min_prio_thresh` int default NULL, modify `max_submit_jobs_pa` int default NULL, modify `max_submit_jobs_per_user` int default NULL, modify `max_tres_pa` text not null default \'\', modify `max_tres_pj` text not null default \'\', modify `max_tres_pn` text not null default \'\', modify `max_tres_pu` text not null default \'\', modify `max_tres_mins_pj` text not null default \'\', modify `max_tres_run_mins_pa` text not null default \'\', modify `max_tres_run_mins_pu` text not null default \'\', modify `min_tres_pj` text not null default \'\', modify `max_wall_duration_per_job` int default NULL, modify `grp_jobs` int default NULL, modify `grp_jobs_accrue` int default NULL, modify `grp_submit_jobs` int default NULL, modify `grp_tres` text not null default \'\', modify `grp_tres_mins` text not null default \'\', modify `grp_tres_run_mins` text not null default \'\', modify `grp_wall` int default NULL, modify `preempt` text not null default \'\', modify `preempt_mode` int default 0, modify `preempt_exempt_time` int unsigned default NULL, modify `priority` int unsigned default 0, modify `usage_factor` double default 1.0 not null, modify `usage_thres` double default NULL, modify `limit_factor` double default NULL, drop primary key, add primary key (id), drop index udex, add unique index udex (name(42));'),(1754086818,1754086818,'res_table','alter table res_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `id` int not null auto_increment, modify `name` tinytext not null, modify `description` text default null, modify `manager` tinytext not null, modify `server` tinytext not null, modify `count` int unsigned default 0, modify `type` int unsigned default 0, modify `flags` int unsigned default 0, modify `last_consumed` int unsigned default 0, drop primary key, add primary key (id), drop index udex, add unique index udex (name(42), server(42), type);'),(1754086818,1754086818,'tres_table','alter table tres_table modify `creation_time` bigint unsigned not null, modify `deleted` tinyint default 0 not null, modify `id` int not null auto_increment, modify `type` tinytext not null, modify `name` tinytext not null default \'\', drop primary key, add primary key (id), drop index udex, add unique index udex (type(42), name(42));'),(1754086818,1754086818,'txn_table','alter table txn_table modify `deleted` tinyint default 0 not null, modify `id` int not null auto_increment, modify `timestamp` bigint unsigned default 0 not null, modify `action` smallint not null, modify `name` text not null, modify `actor` tinytext not null, modify `cluster` tinytext not null default \'\', modify `info` blob, drop primary key, add primary key (id), drop key archive_delete, add key archive_delete (deleted), drop key archive_purge, add key archive_purge (timestamp, cluster(42));'),(1754086818,1754086818,'user_table','alter table user_table modify `creation_time` bigint unsigned not null, modify `mod_time` bigint unsigned default 0 not null, modify `deleted` tinyint default 0, modify `name` tinytext not null, modify `admin_level` smallint default 1 not null, drop primary key, add primary key (name(42));');
/*!40000 ALTER TABLE `table_defs_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tres_table`
--

DROP TABLE IF EXISTS `tres_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tres_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` tinytext NOT NULL,
  `name` tinytext NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `udex` (`type`(42),`name`(42))
) ENGINE=InnoDB AUTO_INCREMENT=1005 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tres_table`
--

LOCK TABLES `tres_table` WRITE;
/*!40000 ALTER TABLE `tres_table` DISABLE KEYS */;
INSERT INTO `tres_table` VALUES (1754086818,0,1,'cpu',''),(1754086818,0,2,'mem',''),(1754086818,0,3,'energy',''),(1754086818,0,4,'node',''),(1754086818,0,5,'billing',''),(1754086818,0,6,'fs','disk'),(1754086818,0,7,'vmem',''),(1754086818,0,8,'pages',''),(1754086818,1,1000,'dynamic_offset',''),(1754541686,0,1001,'gres','gpu'),(1754541686,0,1002,'gres','gpu:quadro_m2000'),(1754541686,0,1003,'gres','gpumem'),(1754541686,0,1004,'gres','gpuutil');
/*!40000 ALTER TABLE `tres_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `txn_table`
--

DROP TABLE IF EXISTS `txn_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `txn_table` (
  `deleted` tinyint(4) NOT NULL DEFAULT 0,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) unsigned NOT NULL DEFAULT 0,
  `action` smallint(6) NOT NULL,
  `name` text NOT NULL,
  `actor` tinytext NOT NULL,
  `cluster` tinytext NOT NULL DEFAULT '',
  `info` blob DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `archive_delete` (`deleted`),
  KEY `archive_purge` (`timestamp`,`cluster`(42))
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `txn_table`
--

LOCK TABLES `txn_table` WRITE;
/*!40000 ALTER TABLE `txn_table` DISABLE KEYS */;
INSERT INTO `txn_table` VALUES (0,1,1754086820,1405,'localcluster','slurm','','mod_time=1754086820, shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, qos=\',1,\', federation=\'\', fed_id=0, fed_state=0, features=\'\''),(0,2,1754086820,1404,'id_assoc=2','slurm','localcluster','mod_time=1754086820, acct=\'root\', user=\'root\', `partition`=\'\', id_parent=\'1\', lineage=\'/0-root/\', shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, is_def=1, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, flags=131072, qos=\'\', delta_qos=\'\''),(0,3,1754086820,1404,'id_assoc=2','slurm','localcluster','mod_time=1754086820, acct=\'root\', user=\'root\', `partition`=\'\', id_parent=\'1\', lineage=\'/0-root/\', shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, is_def=1, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, flags=131072, qos=\'\', delta_qos=\'\''),(0,4,1754086820,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=1'),(0,5,1754086820,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,6,1754088850,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,7,1754274795,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,8,1754280514,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,9,1754280613,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,10,1754280666,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,11,1754280698,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,12,1754280712,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,13,1754280748,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,14,1754280813,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,15,1754318487,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,16,1754318995,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,17,1754428599,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,18,1754428624,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,19,1754540318,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,20,1754540413,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,21,1754540718,1402,'ucmerced','root','','description=\'university of california, merced\', organization=\'ucmerced\', flags=\'0\''),(0,22,1754540718,1404,'id_assoc=3','root','localcluster','mod_time=1754540718, acct=\'ucmerced\', is_def=0, parent_acct=\'root\', user=\'\', id_parent=\'1\', lineage=\'/ucmerced/\', shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, qos=\'\', delta_qos=\'\''),(0,23,1754540752,1402,'oit','root','','description=\'office of information technology\', organization=\'oit\', flags=\'0\''),(0,24,1754540752,1404,'id_assoc=4','root','localcluster','mod_time=1754540752, acct=\'oit\', is_def=0, parent_acct=\'ucmerced\', user=\'\', id_parent=\'3\', lineage=\'/ucmerced/oit/\', shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, qos=\'\', delta_qos=\'\''),(0,25,1754540800,1406,'rromero','root','','admin_level=1'),(0,26,1754540800,1404,'id_assoc=5','root','localcluster','mod_time=1754540800, acct=\'oit\', is_def=1, user=\'rromero\', `partition`=\'\', id_parent=\'4\', lineage=\'/ucmerced/oit/0-rromero/\', shares=1, grp_jobs=NULL, grp_jobs_accrue=NULL, grp_submit_jobs=NULL, grp_wall=NULL, max_jobs=NULL, max_jobs_accrue=NULL, min_prio_thresh=NULL, max_submit_jobs=NULL, max_wall_pj=NULL, priority=NULL, def_qos_id=NULL, qos=\'\', delta_qos=\'\''),(0,27,1754541072,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,28,1754541093,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,29,1754541100,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,30,1754541686,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,31,1754541686,1485,'id=1001','slurm','localcluster','type=\'gres\', name=\'gpu\''),(0,32,1754541686,1485,'id=1002','slurm','localcluster','type=\'gres\', name=\'gpu:quadro_m2000\''),(0,33,1754541686,1485,'id=1003','slurm','localcluster','type=\'gres\', name=\'gpumem\''),(0,34,1754541686,1485,'id=1004','slurm','localcluster','type=\'gres\', name=\'gpuutil\''),(0,35,1754541858,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,36,1754544146,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,37,1754544158,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,38,1754544294,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,39,1754544468,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,40,1754544475,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,41,1754545121,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0'),(0,42,1754545133,1430,'name=\'localcluster\'','slurm','','control_host=\'127.0.0.1\', control_port=6817, last_port=6817, rpc_version=11008, dimensions=1, flags=0');
/*!40000 ALTER TABLE `txn_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_table`
--

DROP TABLE IF EXISTS `user_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_table` (
  `creation_time` bigint(20) unsigned NOT NULL,
  `mod_time` bigint(20) unsigned NOT NULL DEFAULT 0,
  `deleted` tinyint(4) DEFAULT 0,
  `name` tinytext NOT NULL,
  `admin_level` smallint(6) NOT NULL DEFAULT 1,
  PRIMARY KEY (`name`(42))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_table`
--

LOCK TABLES `user_table` WRITE;
/*!40000 ALTER TABLE `user_table` DISABLE KEYS */;
INSERT INTO `user_table` VALUES (1754086818,1754086818,0,'root',3),(1754540800,1754540800,0,'rromero',1);
/*!40000 ALTER TABLE `user_table` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-07  7:55:15
